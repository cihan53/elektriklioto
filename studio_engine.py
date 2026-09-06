#!/usr/bin/env python3
"""
Sanal Yazılım Stüdyosu — org_chart.json'daki rolleri sırayla Claude'a çalıştıran
doküman/kod üretim boru hattı.

Kullanım:
    pip install anthropic
    export ANTHROPIC_API_KEY=sk-ant-...
    python studio_engine.py                 # kaldığı yerden devam eder
    python studio_engine.py --reset         # state'i sıfırlayıp baştan başlar
    python studio_engine.py --yes           # soru sormadan çalışır
    python studio_engine.py --only cto      # sadece belirtilen rolleri çalıştırır
    python studio_engine.py --dry-run       # API'ye gitmeden planı gösterir
"""

import argparse
import json
import os
import re
import shutil
import time
import subprocess
import sys
from pathlib import Path

# Log'un tail -f ile anlık izlenebilmesi için satır tamponlama.
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

import studio_board as B

try:
    import anthropic
except ImportError:
    sys.exit("[HATA] 'anthropic' paketi kurulu değil. Kurulum:  pip install anthropic")

# -------------------------------------------------------------
# 1. ÇALIŞMA ALANI VE STATE
# -------------------------------------------------------------
ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT / "workspace"
STATE_FILE = WORKSPACE / ".state.json"
SCRATCH_DIR = WORKSPACE / ".scratch"
TRACE_DIR = WORKSPACE / ".trace"
BRIEF_NAME = "proje_kapsami.md"
# Takvime saygı: sprint planlanan başlangıç tarihinden önce başlatılmaz.
RESPECT_CALENDAR = os.getenv("STUDIO_RESPECT_CALENDAR", "0") == "1"

# Uzak/mutlak yol yazımını engellemek için tüm çıktılar bu köklerin altında olmalı.
ALLOWED_OUTPUT_ROOTS = (WORKSPACE,)
# Tek istisna: kullanıcının elle düzenlediği, rollerin zenginleştirdiği canlı
# kapsam dokümanı proje kökünde durur.
ALLOWED_OUTPUT_FILES = {ROOT / "proje_kapsami.md"}


def resolve_path(path_str: str) -> Path:
    """org_chart'taki göreli yolu proje köküne göre çözer."""
    return (ROOT / path_str).resolve()


def check_output_path(path_str: str) -> Path:
    p = resolve_path(path_str)
    if p in ALLOWED_OUTPUT_FILES:
        return p
    if not any(p == root or root in p.parents for root in ALLOWED_OUTPUT_ROOTS):
        raise ValueError(f"Çıktı yolu workspace/ dışına çıkıyor: {path_str}")
    return p


SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
TRACE_DIR.mkdir(parents=True, exist_ok=True)


LOCK_FILE = WORKSPACE / ".lock"


def acquire_lock() -> bool:
    """Tek koşucu garantisi. Zamanlanmış tetikleyici ile elle başlatılan koşu
    aynı anda çalışıp aynı dosyalara yazmasın diye."""
    if LOCK_FILE.exists():
        try:
            pid = int(LOCK_FILE.read_text(encoding="utf-8").strip())
            os.kill(pid, 0)          # süreç yaşıyor mu?
        except (ValueError, ProcessLookupError, PermissionError):
            LOCK_FILE.unlink(missing_ok=True)   # bayat kilit
        else:
            print(f"[i] Başka bir koşucu zaten çalışıyor (pid {pid}); bu tetikleme atlandı.")
            return False
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)
    LOCK_FILE.write_text(str(os.getpid()), encoding="utf-8")
    import atexit
    atexit.register(lambda: LOCK_FILE.unlink(missing_ok=True))
    return True


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            state.setdefault("completed_outputs", [])
            state.setdefault("completed_steps", [])
            return state
        except json.JSONDecodeError:
            print("  [!] .state.json bozuk, sıfırdan başlanıyor.", file=sys.stderr)
    return {"completed_outputs": [], "completed_steps": []}


def save_state(state: dict):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def mark_output_done(state: dict, path_str: str):
    if path_str not in state["completed_outputs"]:
        state["completed_outputs"].append(path_str)
    save_state(state)


def mark_step_done(state: dict, agent_id: str):
    if agent_id not in state["completed_steps"]:
        state["completed_steps"].append(agent_id)
    save_state(state)


# -------------------------------------------------------------
# 1b. ORTAM ÖN KONTROLÜ (deterministik — model kullanılmaz)
# -------------------------------------------------------------
ENV_REPORT = ROOT / "workspace" / "docs" / "ortam_raporu.md"

# (komut, sürüm bayrağı) — sürüm komutu GERÇEKTEN çalıştırılır.
# PATH'te bulunmak yetmez: /usr/local/bin/flutter gibi sarmalayıcı betikler
# var olup çalışmayabilir (fvm'e devredip SDK yoksa girdi bekler ve asılır).
ENV_TOOLS = [
    ("node", "--version"), ("npm", "--version"), ("pnpm", "--version"),
    ("python3", "--version"), ("go", "version"), ("rustc", "--version"),
    ("cargo", "--version"), ("java", "-version"), ("dotnet", "--version"),
    ("ruby", "--version"), ("php", "--version"),
    ("flutter", "--version"), ("dart", "--version"), ("fvm", "--version"),
    ("swift", "--version"), ("xcodebuild", "-version"), ("adb", "version"),
    ("docker", "--version"), ("git", "--version"),
    ("cmake", "--version"), ("make", "--version"),
]
ENV_PROBE_TIMEOUT = 12


def probe_tool(name: str, flag: str) -> dict:
    """Aracı gerçekten çalıştırıp kullanılabilirliğini ölçer."""
    path = shutil.which(name)
    if not path:
        return {"tool": name, "status": "YOK", "path": None, "version": None, "note": ""}
    try:
        # stdin kapalı: etkileşimli bir sarmalayıcı soru sorarsa asılmasın, hemen düşsün.
        proc = subprocess.run(
            [name, flag], capture_output=True, text=True,
            timeout=ENV_PROBE_TIMEOUT, stdin=subprocess.DEVNULL,
        )
    except subprocess.TimeoutExpired:
        return {"tool": name, "status": "BOZUK", "path": path, "version": None,
                "note": f"{ENV_PROBE_TIMEOUT}s içinde yanıt vermedi (muhtemelen girdi bekliyor)"}
    except OSError as e:
        return {"tool": name, "status": "BOZUK", "path": path, "version": None, "note": str(e)}

    out = ((proc.stdout or "") + (proc.stderr or "")).strip()
    first = out.splitlines()[0][:80] if out else ""
    if proc.returncode != 0 and not first:
        return {"tool": name, "status": "BOZUK", "path": path, "version": None,
                "note": f"çıkış kodu {proc.returncode}"}
    return {"tool": name, "status": "VAR", "path": path, "version": first, "note": ""}


def preflight_env(force: bool = False) -> Path:
    """Araç zinciri envanterini ölçer ve rapora yazar. Token harcamaz."""
    if ENV_REPORT.exists() and not force:
        print(f"  [i] Mevcut ortam raporu kullanılıyor ({ENV_REPORT.name}). "
              f"Yenilemek için --refresh-env.")
        return ENV_REPORT

    print("  [i] Ortam taranıyor (her araç gerçekten çalıştırılıyor)...")
    results = [probe_tool(n, f) for n, f in ENV_TOOLS]

    import platform
    lines = [
        "# Ortam Raporu",
        "",
        "> Bu dosya `studio_engine.py` tarafından **ölçülerek** üretilir; model çıktısı değildir.",
        "> Her araç gerçekten çalıştırılmıştır — PATH'te görünmek kullanılabilir olmak demek değildir.",
        "",
        f"- Tarih: {time.strftime('%Y-%m-%d %H:%M')}",
        f"- İşletim sistemi: {platform.system()} {platform.release()} ({platform.machine()})",
        f"- Python: {platform.python_version()}",
        "",
        "## Araç Zinciri",
        "",
        "| Araç | Durum | Sürüm / Not |",
        "|---|---|---|",
    ]
    for r in results:
        detail = r["version"] or r["note"] or "—"
        lines.append(f"| `{r['tool']}` | **{r['status']}** | {detail} |")

    usable = [r["tool"] for r in results if r["status"] == "VAR"]
    broken = [r for r in results if r["status"] == "BOZUK"]
    lines += [
        "",
        "## Kısıt",
        "",
        "Seçilecek teknoloji stack'i **bu makinede derlenebilir ve test edilebilir** olmalıdır.",
        "Kullanılabilir araçlar: " + (", ".join(f"`{t}`" for t in usable) or "yok"),
        "",
    ]
    if broken:
        lines.append("**Kurulu görünen ama çalışmayan araçlar** (bunlara güvenilmemeli):")
        lines.append("")
        for r in broken:
            lines.append(f"- `{r['tool']}` → {r['path']} — {r['note']}")
        lines.append("")
    lines.append("Gerekli bir araç eksikse, stack kararı ya onsuz kurulmalı ya da "
                 "`devops_engineer` rolü kurulum adımlarını açıkça yazmalıdır.")

    ENV_REPORT.parent.mkdir(parents=True, exist_ok=True)
    ENV_REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    ok = sum(1 for r in results if r["status"] == "VAR")
    print(f"  [✓] {ENV_REPORT.relative_to(ROOT)} — {ok} araç kullanılabilir, "
          f"{len(broken)} bozuk, {len(results) - ok - len(broken)} yok")
    return ENV_REPORT


# -------------------------------------------------------------
# 2. CLAUDE API
# -------------------------------------------------------------
# Arka uç: "cli" (Claude Code CLI, varsayılan) veya "api" (Anthropic SDK).
# CLI kullanıcının mevcut `claude` oturumunu kullanır, ayrı API anahtarı istemez.
BACKEND = os.getenv("STUDIO_BACKEND", "cli").lower()

# Sonnet 5 varsayılan; ANTHROPIC_MODEL ile değiştirilebilir (ör. claude-opus-5).
CLAUDE_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
# CLI takma ad da kabul eder: sonnet | opus | fable | tam model adı
CLI_MODEL = os.getenv("STUDIO_CLI_MODEL", "sonnet")
CLI_TIMEOUT = int(os.getenv("STUDIO_CLI_TIMEOUT", "1800"))
# CLI saf metin üretici olarak çalışsın; kendi başına dosya yazıp komut çalıştırmasın.
CLI_DISALLOWED = "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task,NotebookEdit,TodoWrite"

# Antigravity CLI (agy): Gemini / Claude 4.6 / GPT-OSS modellerine erişim verir.
# `agy models` ile listelenir.
AGY_MODEL = os.getenv("STUDIO_AGY_MODEL", "gemini-3.1-pro-high")
AGY_TIMEOUT = int(os.getenv("STUDIO_AGY_TIMEOUT", "1800"))
EFFORT = os.getenv("STUDIO_EFFORT", "high")   # low | medium | high | xhigh | max
# DİKKAT: max_tokens, thinking token'larını DA kapsar. Düşük tutulursa model
# bütçeyi düşünmeye harcayıp hiç metin üretmeden kesilebilir. Sonnet 5 üst sınırı 128k.
MAX_TOKENS = int(os.getenv("STUDIO_MAX_TOKENS", "64000"))

_client = None


TOKEN_FILE = ROOT / ".claude_token"


def load_api_key() -> str | None:
    """Anahtarı ortamdan ya da .claude_token dosyasından alır.

    Dosyadan okurken baştaki/sondaki boşluk ve satır sonu MUTLAKA temizlenir:
    ham newline HTTP başlığını bozar ve 400 döner.
    """
    for var in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"):
        value = (os.getenv(var) or "").strip()
        if value:
            if value != os.getenv(var):
                print(f"  [i] {var} içindeki boşluk/newline temizlendi.")
            os.environ[var] = value
            return value

    if TOKEN_FILE.exists():
        value = TOKEN_FILE.read_text(encoding="utf-8").strip()
        if value:
            print(f"  [i] Anahtar {TOKEN_FILE.name} dosyasından okundu.")
            os.environ["ANTHROPIC_API_KEY"] = value
            return value
    return None


def get_client() -> "anthropic.Anthropic":
    global _client
    if _client is None:
        if not load_api_key():
            print(
                "\n[HATA] Kimlik bilgisi bulunamadı. Şunlardan biri gerekli:\n"
                "        export ANTHROPIC_API_KEY=sk-ant-...\n"
                "        veya proje kökünde .claude_token dosyası\n"
                "        veya  ant auth login",
                file=sys.stderr,
            )
            sys.exit(1)
        # SDK 429/5xx/bağlantı hatalarını kendisi yeniden dener.
        _client = anthropic.Anthropic(max_retries=4, timeout=900.0)
    return _client


def _trace_seq() -> int:
    return len(list(TRACE_DIR.glob("[0-9]*.json"))) + 1


def trace_begin(meta: dict) -> Path:
    """Çağrı başlarken 'şu an ne yapılıyor' bilgisini diske yazar."""
    (TRACE_DIR / "current.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    live = TRACE_DIR / "current.out"
    live.write_text("", encoding="utf-8")
    return live


def trace_end(meta: dict, system_prompt: str, user_prompt: str,
              response: str, usage: dict, cost: float, duration: float):
    """Tamamlanan çağrının tamamını (giden + gelen) kalıcı olarak saklar."""
    record = {
        **meta,
        "finished_at": time.time(),
        "duration_s": round(duration, 1),
        "usage": usage,
        "cost_usd": cost,
        "response_chars": len(response),
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "response": response,
    }
    (TRACE_DIR / f"{meta['seq']:04d}.json").write_text(
        json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")

    summary = {k: record[k] for k in
               ("seq", "role", "target", "backend", "model", "effort",
                "duration_s", "cost_usd", "response_chars")}
    summary["tokens_in"] = usage.get("input_tokens", 0)
    summary["tokens_out"] = usage.get("output_tokens", 0)
    with (TRACE_DIR / "index.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(summary, ensure_ascii=False) + "\n")

    (TRACE_DIR / "current.json").write_text("{}", encoding="utf-8")


VALID_BACKENDS = ("cli", "api", "agy")


def resolve_engine(agent: dict) -> tuple[str, str, str, list]:
    """Rolün motorunu belirler: (backend, model, effort, tools).

    Öncelik: org_chart'taki rol alanı > komut satırı/ortam varsayılanı.
    Böylece her rol farklı bir modelde çalışabilir; çıktısı yine bir sonraki
    rolün girdisi olur (roller arası devir aynı dosya akışı üzerinden).
    """
    backend = (agent.get("backend") or BACKEND).lower()
    if backend not in VALID_BACKENDS:
        raise ValueError(
            f"'{agent['id']}' rolünde geçersiz backend: {backend} "
            f"({' veya '.join(VALID_BACKENDS)} olmalı)"
        )
    default_model = {"cli": CLI_MODEL, "api": CLAUDE_MODEL, "agy": AGY_MODEL}[backend]
    # Varsayılan: hiçbir araç yok (saf metin üreteci). Bir rol açıkça isterse
    # (ör. paket araştırması için WebSearch) yalnızca o araçlar açılır.
    tools = agent.get("tools") or []
    if not isinstance(tools, list):
        raise ValueError(f"'{agent['id']}' rolünde 'tools' liste olmalı")
    return (backend, agent.get("model") or default_model,
            agent.get("effort") or EFFORT, tools)


class CliResult:
    """CLI yanıtını _call_once ile aynı arayüze oturtan hafif sarmalayıcı."""

    def __init__(self, text: str, stop_reason: str, cost: float, usage: dict):
        self.text = text
        self.stop_reason = stop_reason
        self.cost = cost
        self.usage = usage


def find_exe(name: str) -> str | None:
    """Komutu bulur. Arka plan başlatmalarında PATH eksik olabildiği için
    STUDIO_<AD>_BIN ortam değişkeni ve bilinen kurulum dizinleri de denenir."""
    override = os.getenv(f"STUDIO_{name.upper()}_BIN")
    if override and Path(override).exists():
        return override
    found = shutil.which(name)
    if found:
        return found
    for base in ("~/.npm-global/bin", "~/.local/bin", "/usr/local/bin",
                 "/opt/homebrew/bin"):
        cand = Path(base).expanduser() / name
        if cand.exists():
            return str(cand)
    return None


def _call_cli(system_prompt: str, user_prompt: str, effort: str, model: str,
              tools: list | None = None) -> CliResult:
    """Claude Code CLI'yi -p (print) kipinde çalıştırır."""
    exe = find_exe("claude")
    if not exe:
        sys.exit("[HATA] 'claude' CLI bulunamadı. STUDIO_BACKEND=api ile API'ye geçebilirsiniz.")

    cmd = [
        exe, "-p",
        "--model", model,
        "--effort", effort,
        "--system-prompt", system_prompt,
        # stream-json: metin parçaları geldikçe canlı izlenebilsin.
        "--output-format", "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--no-session-persistence",
    ]
    # İzin verilen araçlar yasak listesinden çıkarılır; gerisi kapalı kalır.
    allowed = list(tools or [])
    # İzin girdisi "Bash(docker:*)" gibi desenli olabilir; yasak listesiyle
    # karşılaştırırken parantezli kısmı at, yoksa "Bash" yasakta kalır ve
    # desenli izin hiç işe yaramaz.
    allowed_names = {t.split("(", 1)[0] for t in allowed}
    blocked = [t for t in CLI_DISALLOWED.split(",") if t not in allowed_names]
    cmd += ["--disallowed-tools", ",".join(blocked)]
    if allowed:
        cmd += ["--allowed-tools", ",".join(allowed)]
    live = TRACE_DIR / "current.out"
    data = None
    stray: list[str] = []          # JSON olmayan stdout satırları (kota mesajı buradan gelir)
    deadline = time.time() + CLI_TIMEOUT

    # start_new_session: alt süreç kendi oturumunda çalışır. Aksi hâlde terminal
    # kapandığında SIGHUP tüm süreç grubuna gider ve claude 129 ile ölür.
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True, bufsize=1,
                            start_new_session=True)
    try:
        proc.stdin.write(user_prompt)
        proc.stdin.close()
        with live.open("a", encoding="utf-8") as lf:
            for line in proc.stdout:
                if time.time() > deadline:
                    proc.kill()
                    raise RuntimeError(f"CLI {CLI_TIMEOUT}s içinde yanıt vermedi.")
                try:
                    evt = json.loads(line)
                except json.JSONDecodeError:
                    if line.strip():
                        stray.append(line.strip()[:200])
                        del stray[:-5]
                    continue
                if evt.get("type") == "stream_event":
                    e = evt["event"]
                    if e.get("type") == "content_block_delta":
                        chunk = (e.get("delta") or {}).get("text") or ""
                        if chunk:
                            lf.write(chunk)
                            lf.flush()
                elif evt.get("type") == "result":
                    data = evt
    finally:
        proc.stdout.close()
        stderr = proc.stderr.read()
        proc.stderr.close()
        proc.wait(timeout=30)

    if proc.returncode != 0:
        # stderr boş kalabiliyor; stdout'taki serbest metni de hataya kat ki
        # kota/limit tespiti çalışsın.
        detail = (stderr.strip() or " / ".join(stray)).strip()
        if proc.returncode == 1 and not detail:
            # Ayrıntısız 1: neredeyse her zaman kota/oturum sorunu — yeniden denenebilir say.
            raise RuntimeError("CLI ayrıntı vermeden 1 ile çıktı (büyük olasılıkla kota "
                               "limiti veya oturum sorunu). limit reached")
        if proc.returncode in (129, -1):      # SIGHUP
            raise RuntimeError("CLI SIGHUP ile öldürüldü (terminal kapandı?). "
                               "Arka planda çalıştırmak için ./basla.sh kullanın.")
        if proc.returncode in (130, -2):      # SIGINT
            raise RuntimeError("CLI kullanıcı tarafından kesildi (Ctrl+C).")
        raise RuntimeError(f"CLI hata koduyla çıktı ({proc.returncode}): {detail[:500]}")
    if data is None:
        raise RuntimeError("CLI sonuç olayı (result) döndürmedi.")

    if data.get("is_error"):
        # Mesaj bazen boş gelir; durum kodunu ve alt türü de taşı ki
        # kota/limit tespiti çalışabilsin.
        parts = [str(data.get("result") or "").strip(),
                 f"subtype={data.get('subtype')}" if data.get("subtype") else "",
                 f"api_status={data.get('api_error_status')}"
                 if data.get("api_error_status") is not None else "",
                 f"stop={data.get('stop_reason')}" if data.get("stop_reason") else ""]
        detail = " | ".join(x for x in parts if x) or "ayrıntı yok"
        raise RuntimeError(f"CLI hata bildirdi: {detail}")

    denials = data.get("permission_denials") or []
    if denials:
        print(f"      (not: {len(denials)} araç çağrısı engellendi — metin üretimi bekleniyordu)",
              file=sys.stderr)

    return CliResult(
        text=(data.get("result") or "").strip(),
        stop_reason=data.get("stop_reason") or "end_turn",
        cost=data.get("total_cost_usd") or 0.0,
        usage=data.get("usage") or {},
    )


# agy yalnızca low/medium/high kabul eder; üstteki seviyeler kırpılır.
AGY_EFFORTS = {"low": "low", "medium": "medium", "high": "high", "xhigh": "high", "max": "high"}


def _call_agy(system_prompt: str, user_prompt: str, effort: str, model: str) -> CliResult:
    """Antigravity CLI'yi print kipinde çalıştırır.

    İki uyarlama gerekiyor:
      1. agy'de --system-prompt yok; rol promptu kullanıcı mesajının başına konur.
      2. Bayraklar Go tarzı ayrıştırılıyor; prompt -p'ye YAPIŞIK verilmeli (-p=...).
    """
    exe = find_exe("agy")
    if not exe:
        sys.exit("[HATA] 'agy' bulunamadı. --backend cli veya api kullanın.")

    merged = (
        f"<rol_tanimi>\n{system_prompt}\n</rol_tanimi>\n\n"
        f"Yukarıdaki rol tanımına göre davran.\n\n{user_prompt}"
    )
    cmd = [
        exe,
        "--output-format", "json",
        "--disable-slash-commands",
        "--model", model,
        "--print-timeout", f"{AGY_TIMEOUT}s",
    ]
    # agy model adları effort'u zaten taşır (ör. gemini-3.8-flash-high).
    # Böyle bir modele ayrıca --effort vermek "conflicts with --effort" hatası verir.
    if not model.endswith(("-low", "-medium", "-high", "-thinking")):
        cmd += ["--effort", AGY_EFFORTS.get(effort, "high")]
    cmd.append(f"-p={merged}")
    try:
        # Proje dizini dışında çalıştırılır: agy dosya aracı kullanmaya kalksa bile
        # workspace/ dokunulmadan kalır, dosyaları motorun kendisi yazar.
        proc = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=AGY_TIMEOUT + 60, cwd=SCRATCH_DIR,
            start_new_session=True,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"agy {AGY_TIMEOUT}s içinde yanıt vermedi.")

    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()[:500]
        raise RuntimeError(f"agy hata koduyla çıktı ({proc.returncode}): {detail}")

    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"agy JSON döndürmedi: {proc.stdout.strip()[:300]}")

    # agy izin sistemi bir aracı reddettiğinde SUCCESS döner ama response BOŞ kalır.
    # Bu bütçe sorunu değildir; yanıltıcı "boş yanıt" hatasına düşmeden bildir.
    denied = data.get("denied_actions") or []
    if denied and not (data.get("response") or "").strip():
        names = ", ".join(d.get("display_name", d.get("action", "?")) for d in denied)
        raise RuntimeError(
            f"agy araç kullanmaya çalıştı ve izin sistemi reddetti ({names}); "
            f"bu yüzden hiç metin üretmedi. Bu rol araç gerektiriyorsa 'cli' arka ucuna "
            f"alın (orada Bash izni desen bazlı verilebilir)."
        )

    status = (data.get("status") or "").upper()
    if status != "SUCCESS":
        raise RuntimeError(f"agy durumu {status or 'bilinmiyor'}: "
                           f"{str(data.get('response') or data.get('error'))[:300]}")

    text = (data.get("response") or "").strip()
    (TRACE_DIR / "current.out").write_text(text, encoding="utf-8")
    return CliResult(
        text=text,
        stop_reason="end_turn",
        cost=0.0,                      # agy maliyet bildirmiyor
        usage=data.get("usage") or {},
    )


def _call_once(system_prompt: str, user_prompt: str, effort: str, max_tokens: int, model: str):
    """Tek bir istek atar, ham Message döndürür. Uzun çıktılar için streaming."""
    client = get_client()
    try:
        with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            thinking={"type": "adaptive"},
            output_config={"effort": effort},
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            message = stream.get_final_message()
    except anthropic.AuthenticationError:
        sys.exit("[HATA] API anahtarı geçersiz.")
    except anthropic.PermissionDeniedError:
        sys.exit("[HATA] API anahtarının bu model için yetkisi yok.")
    except anthropic.NotFoundError:
        sys.exit(f"[HATA] Model bulunamadı: {model}")
    except anthropic.RateLimitError:
        raise RuntimeError("Rate limit aşıldı (SDK yeniden denemeleri de yetmedi).")
    except anthropic.APIStatusError as e:
        raise RuntimeError(f"API hatası {e.status_code}: {e.message}")
    except anthropic.APIConnectionError as e:
        raise RuntimeError(f"Bağlantı hatası: {e}")

    if message.stop_reason == "refusal":
        detail = getattr(message.stop_details, "explanation", "") or ""
        raise RuntimeError(f"Model isteği reddetti. {detail}")
    return message


# Kota/limit hatalarında ölmek yerine bekle-ve-devam et.
LIMIT_PATTERNS = (
    "usage limit", "rate limit", "quota", "resets at", "too many requests",
    "429", "limit reached", "kota", "try again later", "overloaded",
    "ayrıntı yok", "api_status=5", "api_status=429", "error_during_execution",
)
MAX_WAIT = int(os.getenv("STUDIO_MAX_WAIT", "18000"))   # varsayılan 5 saat
WAIT_STEP = 120


def is_limit_error(msg: str) -> bool:
    low = msg.lower()
    return any(pat in low for pat in LIMIT_PATTERNS)


def wait_for_quota(reason: str, waited: int) -> int:
    """Limit hatasında bekler. Bekleme sırasında durdurma isteğine saygı duyar."""
    if waited >= MAX_WAIT:
        raise RuntimeError(
            f"Kota limiti {MAX_WAIT // 3600} saattir açılmadı, vazgeçiliyor. Son hata: {reason}"
        )
    remaining = MAX_WAIT - waited
    step = min(WAIT_STEP, remaining)
    print(f"  [~] Kota/limit hatası. {step}s beklenip tekrar denenecek "
          f"(toplam beklenen {waited // 60}dk, üst sınır {MAX_WAIT // 3600}sa).",
          file=sys.stderr)
    print(f"      {reason[:160]}", file=sys.stderr)

    slept = 0
    while slept < step:
        if B.is_set("stop"):
            raise RuntimeError("Beklerken durdurma isteği alındı.")
        time.sleep(min(10, step - slept))
        slept += 10
    return waited + step


def query_claude(system_prompt: str, user_prompt: str,
                 backend: str, model: str, base_effort: str,
                 trace_meta: dict, tools: list | None = None) -> str:
    """Metin çıktısını döndürür.

    max_tokens bütçesi thinking'i de kapsadığı için, yüksek effort'ta model
    bütçeyi düşünmeye harcayıp boş ya da yarım metin bırakabilir. Böyle bir
    durumda daha düşük effort ile bir kez daha denenir (düşünmeye az, metne
    çok yer kalır).
    """
    plan = [(base_effort, MAX_TOKENS)]
    if base_effort not in ("low", "medium"):
        plan.append(("medium", MAX_TOKENS))

    last_text = ""
    for i, (effort, max_tokens) in enumerate(plan):
        suffix = f", effort={effort}" if i else ""
        meta = dict(trace_meta, effort=effort, attempt=i + 1,
                    started_at=time.time(), prompt_chars=len(system_prompt) + len(user_prompt))
        trace_begin(meta)
        t0 = time.time()

        waited = 0
        while True:
            try:
                if backend in ("cli", "agy"):
                    if backend == "cli":
                        res = _call_cli(system_prompt, user_prompt, effort, model, tools)
                        cost = f", ${res.cost:.4f}"
                    else:
                        res = _call_agy(system_prompt, user_prompt, effort, model)
                        cost = ""
                    text = res.text
                    truncated = res.stop_reason == "max_tokens"
                    u = res.usage
                    print(f"      ({backend}: {u.get('input_tokens', 0)} girdi / "
                          f"{u.get('output_tokens', 0)} çıktı{cost}{suffix})")
                else:
                    message = _call_once(system_prompt, user_prompt, effort, max_tokens, model)
                    text = "".join(b.text for b in message.content if b.type == "text").strip()
                    truncated = message.stop_reason == "max_tokens"
                    u = message.usage
                    print(f"      (api: {u.input_tokens} girdi / {u.output_tokens} çıktı{suffix})")
                break
            except RuntimeError as e:
                if not is_limit_error(str(e)):
                    raise
                waited = wait_for_quota(str(e), waited)

        trace_end(meta, system_prompt, user_prompt, text,
                  dict(u) if isinstance(u, dict) else u.model_dump(),
                  getattr(res, "cost", 0.0) if backend in ("cli", "agy") else 0.0,
                  time.time() - t0)

        if text and not truncated:
            return text

        last_text = text or last_text
        problem = "boş yanıt" if not text else f"max_tokens ({max_tokens}) sınırında kesildi"
        if i + 1 < len(plan):
            print(f"  [!] {problem} — daha düşük effort ile yeniden deneniyor.", file=sys.stderr)
        else:
            if not last_text:
                raise RuntimeError(
                    f"{problem}. Bütçe artırılabilir: STUDIO_MAX_TOKENS=96000, "
                    f"ya da STUDIO_EFFORT=medium."
                )
            print(f"  [!] UYARI: çıktı {problem}; yarım içerik yazılıyor.", file=sys.stderr)

    return last_text


# -------------------------------------------------------------
# 3. GİRDİ TOPLAMA
# -------------------------------------------------------------
MAX_DIR_FILES = 30


def read_input(path_str: str) -> str:
    """Girdiyi okur. Dizinse içindeki tüm dosyaları etiketleyerek birleştirir."""
    p = resolve_path(path_str)

    if p.is_dir():
        files = sorted(f for f in p.rglob("*") if f.is_file() and not f.name.startswith("."))
        if not files:
            raise FileNotFoundError(path_str)
        parts = []
        for f in files[:MAX_DIR_FILES]:
            rel = f.relative_to(ROOT)
            parts.append(f"### Dosya: {rel}\n```\n{f.read_text(encoding='utf-8', errors='replace')}\n```")
        if len(files) > MAX_DIR_FILES:
            parts.append(f"_(+{len(files) - MAX_DIR_FILES} dosya daha var, gösterilmedi)_")
        return "\n\n".join(parts)

    if p.is_file():
        return p.read_text(encoding="utf-8", errors="replace")

    raise FileNotFoundError(path_str)


def collect_inputs(agent: dict, strict: bool = True) -> str:
    """Ajanın girdilerini toplar.

    strict=True (doğrusal tasarım aşaması): sıralama girdilerin var olmasını
    garanti eder, eksik girdi hatadır — sessiz placeholder üretmeyiz.

    strict=False (sprint panosu): bir rol herhangi bir sırada çağrılabilir ve
    rol seviyesindeki girdi listesi o an henüz üretilmemiş dokümanlar içerebilir.
    Sıralamayı panonun 'depends_on' alanı yönetir; burada eksik doküman
    engelleyici değil, prompt'a düşülen bir nottur.
    """
    blocks = []
    missing = []
    for inp in agent["inputs"]:
        try:
            content = read_input(inp)
        except FileNotFoundError:
            missing.append(inp)
            continue
        blocks.append(f"===== GİRDİ DOKÜMANI: {inp} =====\n{content}")

    if missing and strict:
        raise FileNotFoundError(
            f"'{agent['id']}' rolünün girdileri eksik: {', '.join(missing)}. "
            "Önceki adımlar tamamlanmadan bu rol çalıştırılamaz."
        )
    if missing:
        if not blocks:
            raise FileNotFoundError(
                f"'{agent['id']}' rolünün HİÇBİR girdisi mevcut değil "
                f"({', '.join(missing)}); görev çalıştırılamaz."
            )
        blocks.append(
            "===== HENÜZ ÜRETİLMEMİŞ GİRDİLER =====\n"
            + "\n".join(f"- {m}" for m in missing)
            + "\nBu dokümanlar bu aşamada mevcut değil. Onlara atıfta bulunma, "
              "içeriklerini uydurma; görevini eldeki girdilerle yap ve eksikten "
              "kaynaklanan varsayımlarını '> **Varsayım:**' ile işaretle."
        )
    return "\n\n".join(blocks)


# -------------------------------------------------------------
# 4. ÇIKTI YAZMA (tek dosya + çok dosyalı dizin hedefi)
# -------------------------------------------------------------
FILE_MARKER = re.compile(r"^===\s*FILE:\s*(.+?)\s*===\s*$", re.MULTILINE)
FENCE = re.compile(r"^\s*```[a-zA-Z0-9_+-]*\s*\n(.*?)\n\s*```\s*$", re.DOTALL)


def strip_fence(text: str) -> str:
    """Yanıtın tamamı tek bir kod bloğuysa çitleri kaldırır."""
    m = FENCE.match(text.strip())
    return m.group(1) if m else text


HISTORY_DIR = WORKSPACE / ".history"


def write_single_file(path_str: str, content: str) -> list[Path]:
    out = check_output_path(path_str)
    out.parent.mkdir(parents=True, exist_ok=True)

    # Üzerine yazmadan önce önceki sürümü sakla. Kapsam dokümanı gibi birden çok
    # rolün sırayla zenginleştirdiği dosyalarda evrimi geriye dönük izlenebilir kılar.
    if out.exists():
        HISTORY_DIR.mkdir(parents=True, exist_ok=True)
        n = len(list(HISTORY_DIR.glob(f"{out.stem}.*{out.suffix}"))) + 1
        shutil.copy2(out, HISTORY_DIR / f"{out.stem}.{n:02d}{out.suffix}")
    if out.suffix.lower() != ".md":
        content = strip_fence(content)
    out.write_text(content.rstrip() + "\n", encoding="utf-8")
    return [out]


def write_multi_file(dir_str: str, content: str) -> list[Path]:
    """'=== FILE: yol ===' bloklarını ayrıştırıp dizine yazar."""
    base = check_output_path(dir_str)
    matches = list(FILE_MARKER.finditer(content))

    if not matches:
        print(f"  [!] '{dir_str}' için dosya işaretleyicisi bulunamadı; "
              f"tüm çıktı _CIKTI.md'ye yazılıyor.", file=sys.stderr)
        base.mkdir(parents=True, exist_ok=True)
        target = base / "_CIKTI.md"
        target.write_text(content.rstrip() + "\n", encoding="utf-8")
        return [target]

    # Yeniden üretimde eski dosyalar yenilerinin yanında kalmasın: dizin
    # silinmez, workspace/.stale altına taşınır (geri alınabilir).
    if base.exists() and any(base.iterdir()):
        stale = WORKSPACE / ".stale" / f"{base.name}-{int(time.time())}"
        stale.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(base), str(stale))
        print(f"  [i] Önceki '{dir_str}' içeriği {stale.relative_to(ROOT)} altına taşındı.")
    base.mkdir(parents=True, exist_ok=True)

    written = []
    for i, m in enumerate(matches):
        raw_name = m.group(1).strip().lstrip("/")
        body = content[m.end(): matches[i + 1].start() if i + 1 < len(matches) else len(content)]

        target = (base / raw_name).resolve()
        if base not in target.parents and target != base:
            print(f"  [!] '{raw_name}' dizin dışına çıkıyor, atlandı.", file=sys.stderr)
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(strip_fence(body).rstrip() + "\n", encoding="utf-8")
        written.append(target)
    return written


# -------------------------------------------------------------
# 5. PROMPT KURULUMU
# -------------------------------------------------------------
SYSTEM_SUFFIX = """

--- ÇALIŞMA KURALLARI ---
Otomatik bir boru hattında çalışıyorsun. Karşında cevap verebilecek bir insan YOK.
- ASLA soru sorma, bilgi isteme, "dosyayı paylaşır mısınız" deme.
- Bir bilgi eksikse makul bir varsayım yap, varsayımı çıktının içinde
  "> **Varsayım:**" satırıyla açıkça işaretle ve devam et.
- Yalnızca istenen dosyanın nihai içeriğini üret. "İşte dosya:" gibi giriş cümlesi,
  kapanış özeti veya sohbet metni yazma.
- Cevabın doğrudan dosyaya yazılacak; başka hiçbir yere gitmeyecek.
- Dokümanlarda "(zorunlu)" ibaresi taşıyan her satır kullanıcının KESİN kararıdır:
  seçenek değildir, yeniden değerlendirilmez, alternatifi önerilmez."""

# Doküman çıktıları için varsayılan kelime bütçesi. Rol bazında "max_words"
# ile ezilebilir. Kod/dizin hedeflerine uygulanmaz.
# Kullanıcının kapsam dokümanında "(zorunlu)" yazdığı satır bir KARARDIR,
# tartışılacak bir seçenek değil. Uzun dokümanların içinde kaybolmasın diye
# bu satırlar çıkarılıp prompt'un en başına ayrı blok olarak konur.
MANDATORY_MARKERS = ("(zorunlu)", "(ZORUNLU)", "(Zorunlu)")


def extract_mandatory(text: str) -> list[str]:
    out = []
    for line in text.splitlines():
        stripped = line.strip()
        # Alıntı bloğu (>) dokümanın kullanım talimatıdır, kısıt değil.
        if stripped.startswith(">"):
            continue
        if any(m.lower() in stripped.lower() for m in MANDATORY_MARKERS):
            clean = stripped.lstrip("-*# ").strip()
            if clean and clean not in out:
                out.append(clean)
    return out


DOC_WORD_BUDGET = int(os.getenv("STUDIO_DOC_WORDS", "1800"))

LENGTH_RULE = """
--- UZUNLUK DİSİPLİNİ ---
Bu doküman en fazla ~{words} kelime olmalı. KARAR dokümanı yaz, ders kitabı değil:
- Kararı, tek cümlelik gerekçesini ve somut sonucunu yaz.
- Değerlendirilen alternatifleri tek satırda geç; her birini paragraflarla anlatma.
- Aynı bilgiyi hem tabloda hem düz metinde tekrarlama.
- Kod örneği yalnızca karar başka türlü anlaşılmıyorsa, kısa tutulur.
Bu doküman aşağı akıştaki rollere GİRDİ olacak; şişkin doküman onların odağını dağıtır.
"""

SCOPE_EDIT_RULE = """
--- KAPSAM DOKÜMANI DÜZENLEME KURALI ---
Bu doküman KULLANICININ dokümanıdır, senin değil. Mevcut bölüm yapısını ve
kullanıcının cümlelerini olduğu gibi koru.
- EN FAZLA 10 madde ekle, toplamda ~400 kelimeyi geçme.
- Yalnızca kendi uzmanlık alanından gerçek bir eksik/risk varsa ekle; yoksa ekleme.
- Her eklemeni '<!-- rol: {rid} -->' ile başlat ve kısa madde işaretiyle yaz.
- Yeni üst başlık (##) AÇMA; mevcut bölümlerin altına ekle.
- Dokümanın tamamını döndür ama uzunluğunu iki katına çıkarma.
"""

SINGLE_FILE_TASK = """
--- ÜRETECEĞİN DOSYA ---
Şu anda TEK bir dosya üretiyorsun: `{path}`
Bu dosyanın tam içeriğini yaz.{extra}

Not: Bu roldeki diğer teslimatlar ({siblings}) ayrı ayrı istenecek —
onların içeriğini buraya karıştırma, bu dosyanın kapsamına odaklan."""

MULTI_FILE_TASK = """
--- ÜRETECEĞİN DOSYALAR ---
`{path}` dizininin içeriğini üreteceksin. Birden fazla kaynak dosya yaz.
Her dosyayı tam olarak şu formatta ayır (dizine göre GÖRELİ yol kullan):

=== FILE: alt/dizin/dosya_adi.uzanti ===
<dosyanın ham içeriği — markdown kod çiti YOK>

=== FILE: diger_dosya.uzanti ===
<...>

Dosya uzantılarını mimari dokümanda seçilen dile/framework'e göre belirle.
İşaretleyici satırları dışında hiçbir açıklama metni yazma."""

CODE_HINT = "\nBu bir kaynak kod dosyası: markdown kod çiti kullanma, sadece ham kodu yaz."


def build_prompts(agent: dict, target: str, siblings: list[str], brief: str,
                  inputs_text: str, revision_note: str = "") -> tuple[str, str]:
    system = agent["system_prompt"] + SYSTEM_SUFFIX

    is_dir = target.endswith("/")
    # Uzunluk disiplini: kapsam dokümanının kendine özel kuralı var, diğer
    # markdown çıktılarına kelime bütçesi uygulanır, kod dizinlerine uygulanmaz.
    if target == BRIEF_NAME:
        system += SCOPE_EDIT_RULE.format(rid=agent["id"])
    elif not is_dir and target.endswith(".md"):
        words = int(agent.get("max_words") or DOC_WORD_BUDGET)
        system += LENGTH_RULE.format(words=words)

    if is_dir:
        task = MULTI_FILE_TASK.format(path=target)
    else:
        extra = "" if target.endswith(".md") else CODE_HINT
        task = SINGLE_FILE_TASK.format(
            path=target,
            extra=extra,
            siblings=", ".join(f"`{s}`" for s in siblings) if siblings else "yok",
        )

    head = f"===== PROJE ÖZETİ =====\n{brief}\n\n" if brief.strip() else ""

    mandatory = extract_mandatory(brief + "\n" + inputs_text)
    if mandatory:
        items = "\n".join(f"- {m}" for m in mandatory)
        head = ("===== ZORUNLU KISITLAR (TARTIŞMAYA KAPALI) =====\n"
                "Aşağıdakiler kullanıcının verdiği kararlardır. Bunları sorgulamaz, "
                "alternatif önermez, gerekçesini tartışmaz, 'değerlendirilebilir' demezsin. "
                "Tasarımını bunların ÜSTÜNE kurarsın. Bir zorunluluk teknik olarak "
                "imkânsızsa, alternatif seçmek yerine çıktında "
                "'> **ÇATIŞMA:**' satırıyla durumu bildirir ve kullanıcıya bırakırsın.\n"
                f"{items}\n\n") + head
    user = f"""{head}{inputs_text}
{revision_note}
{task}"""
    return system, user


# -------------------------------------------------------------
# 6. BORU HATTI
# -------------------------------------------------------------
def run_agent(agent: dict, brief: str, state: dict, force: bool = False,
              revision_note: str = "", dry_run: bool = False) -> list[Path]:
    """Ajanın her çıktısı için AYRI bir istek atar."""
    def gather() -> str:
        try:
            return collect_inputs(agent)
        except FileNotFoundError:
            if not dry_run:
                raise
            print("    [dry-run] girdiler henüz üretilmemiş, prompt boyutu eksik hesaplanıyor.")
            return ""

    backend, model, effort, tools = resolve_engine(agent)
    # Kapsam dokümanı zaten bu rolün girdisiyse özet bloğunu tekrarlama.
    agent_brief = "" if BRIEF_NAME in agent["inputs"] else brief
    produced = []

    for target in agent["outputs"]:
        # Rol kendi girdisini güncelliyor olabilir (ör. kapsam dokümanı);
        # her hedef öncesi diskten tazele.
        inputs_text = gather()
        done = target in state["completed_outputs"]
        exists = resolve_path(target).exists()
        if done and exists and not force:
            print(f"    [atlandı] {target} zaten üretilmiş.")
            continue

        siblings = [o for o in agent["outputs"] if o != target]
        system, user = build_prompts(agent, target, siblings, agent_brief,
                                     inputs_text, revision_note)

        if dry_run:
            print(f"    [dry-run] {target}  ({backend}/{model}, effort={effort}, "
                  f"prompt ~{len(system) + len(user)} karakter)")
            continue

        print(f"    -> üretiliyor: {target}")
        meta = {
            "seq": _trace_seq(),
            "role": agent["id"],
            "title": agent["title"],
            "target": target,
            "backend": backend,
            "model": model,
            "tools": tools,
        }
        output = query_claude(system, user, backend, model, effort, meta, tools)

        if target.endswith("/"):
            files = write_multi_file(target, output)
        else:
            files = write_single_file(target, output)

        for f in files:
            extra = ""
            if f.suffix == ".md":
                w = len(f.read_text(encoding="utf-8", errors="replace").split())
                budget = int(agent.get("max_words") or DOC_WORD_BUDGET)
                if target == BRIEF_NAME:
                    extra = f"  ({w:,} kelime)"
                elif w > budget * 1.6:
                    extra = f"  [!] {w:,} kelime — bütçe {budget:,}"
                else:
                    extra = f"  ({w:,} kelime)"
            print(f"       [✓] {f.relative_to(ROOT)}{extra}")
        produced.extend(files)
        mark_output_done(state, target)

    return produced


def run_revision_loop(agent: dict, org_by_id: dict, brief: str, state: dict,
                      max_rounds: int, dry_run: bool):
    """'revises' alanı olan bir eleştirmen rolü, hedef rolü onaylayana kadar döndürür."""
    target_id = agent["revises"]
    target_agent = org_by_id.get(target_id)
    if target_agent is None:
        print(f"  [!] '{agent['id']}' rolünün revizyon hedefi '{target_id}' bulunamadı, "
              f"tek geçişte çalıştırılıyor.", file=sys.stderr)
        run_agent(agent, brief, state, dry_run=dry_run)
        return

    for rnd in range(1, max_rounds + 1):
        print(f"  [tur {rnd}/{max_rounds}] '{target_id}' inceleniyor...")
        run_agent(agent, brief, state, force=(rnd > 1), dry_run=dry_run)
        if dry_run:
            return

        critique = "\n\n".join(read_input(o) for o in agent["outputs"])
        if "VERDICT: APPROVED" in critique:
            print(f"  [✓] Onaylandı (tur {rnd}).")
            return
        if rnd == max_rounds:
            print(f"  [!] {max_rounds} turda onay çıkmadı; mevcut hâliyle devam ediliyor.")
            return

        print(f"  [~] Onay yok — '{target_id}' geri bildirimle yeniden çalıştırılıyor.")
        note = (
            "\n===== DENETÇİ GERİ BİLDİRİMİ (bu turda giderilmesi gerekiyor) =====\n"
            + critique
        )
        run_agent(target_agent, brief, state, force=True, revision_note=note)


def execute_pipeline(org: dict, brief: str, args):
    print(f"\n{'=' * 60}")
    print(f"  🏢 {org['company_name']}")
    print(f"  📦 {org['project']}")
    engine = f"CLI · {CLI_MODEL}" if BACKEND == "cli" else f"API · {CLAUDE_MODEL}"
    print(f"  🤖 {engine} (effort: {EFFORT})")
    print(f"{'=' * 60}")

    state = load_state()
    org_by_id = {a["id"]: a for a in org["hierarchy"]}
    steps = org["hierarchy"]
    if args.stage != "all" and not args.only:
        steps = [a for a in steps if a.get("stage", "design") == args.stage]
        print(f"[i] Aşama filtresi: {args.stage} ({len(steps)} rol). "
              f"Tümü için --stage all.")
    if args.only:
        steps = [a for a in steps if a["id"] in args.only]
        missing = set(args.only) - {a["id"] for a in steps}
        if missing:
            sys.exit(f"[HATA] Bilinmeyen rol id: {', '.join(sorted(missing))}")

    for agent in steps:
        agent_id = agent["id"]
        if agent_id == PLANNER_ID:
            # Pano şema doğrulaması gerektirir; run_planner() üzerinden üretilir.
            continue
        outputs_exist = all(resolve_path(p).exists() for p in agent["outputs"])
        if agent_id in state["completed_steps"] and outputs_exist and not args.only:
            print(f"\n---> [ATLANDI] {agent['title']} ({agent_id})")
            continue

        eng_b, eng_m, eng_e, eng_t = resolve_engine(agent)
        tool_note = f", araçlar={'+'.join(eng_t)}" if eng_t else ""
        print(f"\n---> {agent['title']} ({agent_id})  "
              f"[{eng_b}/{eng_m}, effort={eng_e}{tool_note}]")
        try:
            if "revises" in agent:
                run_revision_loop(agent, org_by_id, brief, state, args.max_revisions, args.dry_run)
            else:
                run_agent(agent, brief, state, dry_run=args.dry_run)
        except FileNotFoundError as e:
            print(f"\n[DURDU] {e}", file=sys.stderr)
            print("        Tamamlanan adımlar kaydedildi; sorunu çözüp tekrar çalıştırın.",
                  file=sys.stderr)
            sys.exit(1)
        except RuntimeError as e:
            print(f"\n[DURDU] {agent_id}: {e}", file=sys.stderr)
            print("        İlerleme .state.json'a kaydedildi; tekrar çalıştırınca kaldığı "
                  "yerden devam eder.", file=sys.stderr)
            sys.exit(1)

        if not args.dry_run:
            mark_step_done(state, agent_id)

    print(f"\n🎉 Bitti. Çıktılar: {WORKSPACE.relative_to(ROOT)}/")


# -------------------------------------------------------------
# 6b. SPRINT PANOSU: PLANLAMA VE GÖREV KOŞUCUSU
# -------------------------------------------------------------
PLANNER_ID = "sprint_planner"


def run_planner(org: dict, brief: str, force: bool = False) -> dict:
    """Planlayıcı rolünü çalıştırıp pano.json üretir (JSON doğrulamalı)."""
    agent = next((a for a in org["hierarchy"] if a["id"] == PLANNER_ID), None)
    if agent is None:
        sys.exit(f"[HATA] '{PLANNER_ID}' rolü org şemasında yok.")
    if B.BOARD_FILE.exists() and not force:
        print("  [i] Mevcut pano kullanılıyor. Yeniden planlamak için --replan.")
        return B.load()

    backend, model, effort, tools = resolve_engine(agent)
    inputs_text = collect_inputs(agent)
    print(f"\n---> {agent['title']} ({PLANNER_ID})  [{backend}/{model}]")

    build_roles = [a for a in org["hierarchy"] if a.get("stage") == "build"]
    roles_block = "\n".join(
        f'- "{a["id"]}" → çıktıları: {", ".join(a["outputs"])}' for a in build_roles)
    # BOARD_TASK JSON şeması içerdiği için .format() kullanılamaz ({ } çakışır).
    task = BOARD_TASK.replace("{roles}", roles_block)

    last_err = ""
    for attempt in (1, 2, 3):
        note = ""
        if last_err:
            note = ("\n\nÖNCEKİ DENEME GEÇERSİZDİ, şu hataları düzelt:\n" + last_err)
        user = (f"===== PROJE ÖZETİ =====\n{brief}\n\n{inputs_text}\n"
                f"{task}{note}")
        meta = {"seq": _trace_seq(), "role": PLANNER_ID, "title": agent["title"],
                "target": str(B.BOARD_FILE.relative_to(ROOT)), "backend": backend,
                "model": model, "tools": tools}
        raw = query_claude(agent["system_prompt"] + SYSTEM_SUFFIX, user,
                           backend, model, effort, meta, tools)

        cleaned = strip_fence(raw).strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
        # Model başa/sona metin eklemiş olabilir: en dıştaki { } bloğunu ayıkla.
        i, j = cleaned.find("{"), cleaned.rfind("}")
        if i > 0 or (j != -1 and j < len(cleaned) - 1):
            if i != -1 and j > i:
                cleaned = cleaned[i:j + 1]
        try:
            board = json.loads(cleaned)
        except json.JSONDecodeError as e:
            last_err = f"- Geçerli JSON değil: {e}"
            print(f"  [!] Deneme {attempt}: JSON ayrıştırılamadı, yeniden isteniyor.",
                  file=sys.stderr)
            continue

        board = B.normalize(board)
        errs = B.validate(board)
        if errs:
            last_err = "\n".join(f"- {e}" for e in errs)
            print(f"  [!] Deneme {attempt}: pano tutarsız ({len(errs)} sorun).", file=sys.stderr)
            continue

        # Rol adları org şemasında var mı?
        known = {a["id"] for a in org["hierarchy"]}
        unknown = {t["role"] for _, t in B.all_tasks(board)} - known
        if unknown:
            last_err = f"- Şemada olmayan rol adları kullanılmış: {sorted(unknown)}"
            print(f"  [!] Deneme {attempt}: bilinmeyen rol.", file=sys.stderr)
            continue

        B.schedule(board)
        board["baseline_end"] = board["sprints"][-1]["planned_end"]
        B.refresh(board)
        B.save(board)
        p = B.progress(board)
        print(f"  [✓] Pano üretildi: {p['sprints_total']} sprint, {p['total']} görev "
              f"→ {B.BOARD_FILE.relative_to(ROOT)}")
        return board

    sys.exit(f"[HATA] Planlayıcı iki denemede de geçerli pano üretemedi:\n{last_err}")


BOARD_TASK = """
--- ÜRETECEĞİN ÇIKTI ---
Yalnızca GEÇERLİ JSON üret. Markdown kod çiti, açıklama, giriş cümlesi YOK.

Şema:
{
  "sprints": [
    {
      "id": "S1",
      "name": "kısa sprint adı",
      "goal": "bu sprint sonunda neyin çalışır durumda olacağı",
      "planned_days": 3,
      "tasks": [
        {
          "id": "S1-T1",
          "title": "kısa görev başlığı",
          "description": "bu görevde tam olarak ne üretilecek",
          "role": "org şemasındaki bir rol id'si",
          "phase": "develop | test | deploy",
          "outputs": ["workspace/... yol"],
          "depends_on": ["aynı veya önceki sprint'teki görev id'leri"]
        }
      ]
    }
  ]
}

Kurallar:
- Her sprint ÇALIŞAN, gösterilebilir bir dilim üretmeli — katman değil, özellik dilimi.
- Her sprint'te en az bir "develop" ve bir "test" görevi olmalı; "deploy" sprint'in
  çıktısı paketlenebilir olduğunda eklenir.
- Bağımlılıklar gerçek olmalı: test görevi geliştirme görevine bağlı olmalı.
- planned_days gerçekçi bir TAHMİN; sprint uzarsa takvim otomatik kayacak.

BOYUT SINIRI (kesin):
- EN FAZLA 5 sprint, sprint başına EN FAZLA 5 görev. Toplam 25 görevi geçme.
- "description" en fazla 25 kelime. Uzun anlatım yazma, görev başlığı yeterli.
- Çıktı tek bir JSON nesnesi; yorum satırı, açıklama, markdown YOK.

ROL ADLARI (yalnızca bu listeden seç, BİREBİR kopyala, yenisini UYDURMA):
{roles}

ÇIKTI YOLLARI: her görevin "outputs" değeri, seçtiğin rolün org şemasındaki
çıktı yollarından biri olmalı. Yeni yol icat etme."""


def execute_task(org: dict, task: dict, sprint: dict, brief: str, board: dict) -> bool:
    """Panodaki tek bir görevi yürütür. Başarılıysa True."""
    agent = next((a for a in org["hierarchy"] if a["id"] == task["role"]), None)
    if agent is None:
        B.mark(board, task["id"], B.FAILED, f"rol bulunamadı: {task['role']}")
        return False

    backend, model, effort, tools = resolve_engine(agent)
    print(f"\n---> [{sprint['id']}] {task['id']} · {task['title']}")
    print(f"     rol={task['role']} faz={task['phase']} {backend}/{model}")

    # Görev, rolün şemadaki girdilerini + görev tanımını alır.
    try:
        inputs_text = collect_inputs(agent, strict=False)
    except FileNotFoundError as e:
        B.mark(board, task["id"], B.BLOCKED, str(e))
        print(f"     [!] {e}", file=sys.stderr)
        return False

    task_brief = (
        f"\n--- BU GÖREV ---\n"
        f"Sprint: {sprint['id']} — {sprint['name']}\n"
        f"Sprint hedefi: {sprint.get('goal', '—')}\n"
        f"Görev: {task['title']}\n"
        f"Açıklama: {task.get('description', '—')}\n"
        f"Faz: {task['phase']}\n"
        f"Yalnızca bu görevin kapsamındaki işi yap; sprint dışına taşma.\n"
    )

    for target in task["outputs"]:
        if target in state_of(board).get("done_outputs", []):
            continue
        siblings = [o for o in task["outputs"] if o != target]
        system, user = build_prompts(agent, target, siblings, brief,
                                     inputs_text + task_brief)
        meta = {"seq": _trace_seq(), "role": task["role"], "title": agent["title"],
                "target": target, "backend": backend, "model": model,
                "tools": tools, "task": task["id"], "sprint": sprint["id"]}
        try:
            output = query_claude(system, user, backend, model, effort, meta, tools)
        except RuntimeError as e:
            B.mark(board, task["id"], B.FAILED, str(e)[:200])
            print(f"     [!] {e}", file=sys.stderr)
            return False

        files = write_multi_file(target, output) if target.endswith("/") \
            else write_single_file(target, output)
        for f in files:
            print(f"     [✓] {f.relative_to(ROOT)}")

    B.mark(board, task["id"], B.DONE)
    return True


def state_of(board: dict) -> dict:
    return board.setdefault("_runtime", {"done_outputs": []})


def tahmini_gorev_maliyeti(task: dict, varsayilan: float = 0.80) -> float:
    """Sıradaki görev kabaca ne tutar? Son çağrıların ortalamasından kestirilir."""
    f = TRACE_DIR / "index.jsonl"
    costs = []
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines()[-12:]:
            try:
                c = json.loads(line).get("cost_usd")
            except json.JSONDecodeError:
                continue
            if c:
                costs.append(c)
    cagri_basi = sum(costs) / len(costs) if costs else varsayilan
    return round(cagri_basi * max(1, len(task.get("outputs", []))), 4)


def spent_so_far() -> float:
    """Bu projede şimdiye kadar harcanan toplam (iz kayıtlarından)."""
    f = TRACE_DIR / "index.jsonl"
    if not f.exists():
        return 0.0
    total = 0.0
    for line in f.read_text(encoding="utf-8").splitlines():
        try:
            total += json.loads(line).get("cost_usd") or 0.0
        except json.JSONDecodeError:
            pass
    return total


def run_board(org: dict, brief: str, once: bool = False,
              max_tasks: int = 0, max_cost: float = 0.0) -> int:
    """Panoyu ilerletir. once=True ise yalnızca bir görev yürütür (tick)."""
    board = B.load()
    B.refresh(board)

    start_cost = spent_so_far()
    if max_cost:
        print(f"[i] Bütçe sınırı: ${max_cost:.2f} (şimdiye kadar ${start_cost:.2f} harcandı)")

    executed = 0
    while True:
        # Bütçe/görev sınırı: yeni görev ALMADAN önce bakılır, çalışan çağrı kesilmez.
        if max_tasks and executed >= max_tasks:
            print(f"\n[DURDU] Görev sınırına ulaşıldı ({max_tasks}). "
                  f"Devam için tekrar çalıştırın.")
            break
        if max_cost:
            harcanan = spent_so_far() - start_cost
            if harcanan >= max_cost:
                print(f"\n[DURDU] Bütçe sınırına ulaşıldı: bu koşuda ${harcanan:.2f} "
                      f"harcandı (sınır ${max_cost:.2f}). Devam için tekrar çalıştırın.")
                break
        ctrl = B.control_state()
        if ctrl["stopping"]:
            print("\n[DURDURULDU] stop isteği alındı, yeni görev başlatılmıyor.")
            B.clear("stop")
            break
        if ctrl["paused"]:
            print("\n[DURAKLATILDI] pause bayrağı var; kaldırılana kadar iş alınmıyor.")
            break
        if ctrl["skip"]:
            tid = ctrl["skip"]
            _, t = B.find_task(board, tid)
            if t:
                B.mark(board, tid, B.SKIPPED, "kullanıcı atladı")
                print(f"\n[ATLANDI] {tid}")
            B.clear("skip")
            B.refresh(board); B.save(board)
            continue

        sprint, task = B.next_ready(board)

        # Günlük kota: görev BAŞLAMADAN önce bakılır, sınır aşılmaz.
        if task is not None:
            tahmin = tahmini_gorev_maliyeti(task)
            izin, sebep = B.ledger_check(tahmin)
            if not izin:
                d = B.ledger_read()
                mg, mb = B.ledger_limits()
                print(f"\n[ONAY BEKLENİYOR] {sebep}")
                print(f"  Bugün: {d['gorev']}/{mg} görev, ${d['maliyet']:.2f}/${mb:.2f}")
                print(f"  Sıradaki: {task['id']} · {task['title'][:50]} (~${tahmin:.2f})")
                print("  Devam etmek için:  ./basla.sh --onayla")
                break

        if task is not None and RESPECT_CALENDAR and sprint.get("planned_start"):
            from datetime import date
            if date.today() < date.fromisoformat(sprint["planned_start"]):
                print(f"\n[BEKLİYOR] {sprint['id']} planlanan başlangıcı "
                      f"{sprint['planned_start']}; takvime saygı modunda erken başlatılmıyor.")
                break
        if task is None:
            p = B.progress(board)
            if p["done"] + p["failed"] + p["blocked"] >= p["total"]:
                print("\n🎉 Panodaki tüm görevler kapandı.")
            else:
                print("\n[BEKLİYOR] Şu an hazır görev yok "
                      "(önceki sprint kapanmamış ya da bağımlılık bekliyor).")
            break

        B.mark(board, task["id"], B.RUNNING)
        B.save(board)
        onceki = spent_so_far()
        ok = execute_task(org, task, sprint, brief, board)
        gercek = spent_so_far() - onceki
        d = B.ledger_add(gercek)
        mg, mb = B.ledger_limits()
        print(f"     [kota] bugün {d['gorev']}/{mg} görev, "
              f"${d['maliyet']:.2f}/${mb:.2f}  (bu görev ${gercek:.2f})")
        B.refresh(board)
        B.schedule(board)
        B.save(board)
        executed += 1

        if not ok:
            print(f"\n[HATA] {task['id']} başarısız — sonraki sprint açılmayacak.")
            break
        if once:
            break

    return executed


# -------------------------------------------------------------
# 7. ENTRYPOINT
# -------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Sanal Yazılım Stüdyosu boru hattı")
    ap.add_argument("--reset", action="store_true", help="state'i sıfırla, baştan başla")
    ap.add_argument("--yes", "-y", action="store_true", help="onay sorma")
    ap.add_argument("--only", nargs="+", metavar="ID", help="sadece bu rolleri çalıştır")
    ap.add_argument("--dry-run", action="store_true", help="API'ye gitmeden planı göster")
    ap.add_argument("--org", default="org_chart.json", help="org şeması dosyası")
    ap.add_argument("--brief", default="proje_kapsami.md",
                    help="proje özeti / canlı kapsam dosyası")
    ap.add_argument("--max-revisions", type=int, default=3, help="revizyon turu üst sınırı")
    ap.add_argument("--full", action="store_true",
                    help="uçtan uca: ortam taraması + tasarım aşaması + pano + yapım aşaması")
    ap.add_argument("--stage", choices=["design", "build", "all"], default="design",
                    help="doğrusal koşucunun çalıştıracağı aşama (varsayılan: design; "
                         "yapım rollerini sprint panosu yürütür)")
    ap.add_argument("--plan", action="store_true",
                    help="sprint panosunu üret (pano.json)")
    ap.add_argument("--replan", action="store_true",
                    help="mevcut panoyu yok sayıp yeniden planla")
    ap.add_argument("--tick", action="store_true",
                    help="panodan TEK bir hazır görevi yürüt (zamanlanmış görev için)")
    ap.add_argument("--run-board", action="store_true",
                    help="pano bitene veya durana kadar görevleri yürüt")
    ap.add_argument("--max-tasks", type=int, default=0, metavar="N",
                    help="bu koşuda en fazla N görev yürüt (0 = sınırsız)")
    ap.add_argument("--max-cost", type=float, default=0.0, metavar="USD",
                    help="bu koşuda en fazla bu kadar harca, sonra dur (0 = sınırsız)")
    ap.add_argument("--refresh-env", action="store_true",
                    help="ortam raporunu yeniden ölç")
    ap.add_argument("--backend", choices=["cli", "api", "agy"], default=None,
                    help="çalıştırma arka ucu (varsayılan: cli)")
    args = ap.parse_args()

    global BACKEND
    if args.backend:
        BACKEND = args.backend
    if BACKEND not in ("cli", "api"):
        sys.exit(f"[HATA] Geçersiz arka uç: {BACKEND} (cli veya api olmalı)")


    org_path = ROOT / args.org
    if not org_path.exists():
        sys.exit(f"[HATA] Org şeması bulunamadı: {args.org}")
    org = json.loads(org_path.read_text(encoding="utf-8"))

    brief_path = ROOT / args.brief
    if not brief_path.exists():
        sys.exit(f"[HATA] Proje özeti bulunamadı: {args.brief}")
    brief = brief_path.read_text(encoding="utf-8")

    if not args.dry_run and not acquire_lock():
        return

    preflight_env(force=args.refresh_env)

    if args.reset:
        STATE_FILE.unlink(missing_ok=True)
        print("[i] State sıfırlandı.")

    # Yalnızca gerçekten kullanılacak arka uçların komutu aranır.
    used_backends = {(a.get("backend") or BACKEND).lower() for a in org["hierarchy"]}
    for name, exe in (("cli", "claude"), ("agy", "agy")):
        if name in used_backends and not find_exe(exe):
            sys.exit(f"[HATA] '{exe}' komutu bulunamadı ama şema onu istiyor. "
                     f"İlgili rollerin 'backend' alanını değiştirin veya --backend verin.")

    from collections import Counter
    try:
        engines = Counter(f"{b}/{m}" for b, m, _, _ in
                          (resolve_engine(a) for a in org["hierarchy"]))
    except ValueError as e:
        sys.exit(f"[HATA] {e}")
    if len(engines) > 1:
        print("[i] Motor dağılımı: " +
              ", ".join(f"{k} × {v}" for k, v in sorted(engines.items())))

    n_calls = sum(len(a["outputs"]) for a in org["hierarchy"])
    engine = f"CLI/{CLI_MODEL}" if BACKEND == "cli" else f"API/{CLAUDE_MODEL}"
    print(f"[i] {len(org['hierarchy'])} rol, {n_calls} dosya hedefi "
          f"(≈{n_calls} çağrı, {engine}).")

    interactive_ok = not (args.tick or args.run_board or args.plan or args.replan)
    if not args.yes and not args.dry_run and interactive_ok:
        if input("[?] Başlatılsın mı? (e/h): ").strip().lower() != "e":
            sys.exit("İptal edildi.")

    if args.full:
        # Uçtan uca: tasarım aşaması panoyu da üretir, ardından pano yürütülür.
        print("\n########## AŞAMA 1/2 — TASARIM ##########")
        args.stage = "design"
        execute_pipeline(org, brief, args)

        print("\n---> Sprint panosu üretiliyor (şema doğrulamalı)")
        run_planner(org, brief, force=args.replan)
        if not B.BOARD_FILE.exists():
            sys.exit("[HATA] Pano üretilemedi; 'sprint_planner' rolünü kontrol edin.")

        print("\n########## AŞAMA 2/2 — YAPIM (sprint panosu) ##########")
        n = run_board(org, brief, once=False,
                      max_tasks=args.max_tasks, max_cost=args.max_cost)
        print(f"[i] Yapım aşamasında {n} görev yürütüldü.")
        return

    if args.plan or args.replan:
        run_planner(org, brief, force=args.replan)
        return

    if args.tick or args.run_board:
        # Zamanlanmış tetikleyici pano üretilmeden önce de çalışır. Pano yoksa
        # tasarım aşamasını ilerlet — checkpoint'li olduğu için her tetikleme
        # kaldığı yerden devam eder ve kota açılınca kendiliğinden tamamlanır.
        if not B.BOARD_FILE.exists():
            print("[i] Pano yok — önce tasarım aşaması ilerletiliyor.")
            args.stage = "design"
            execute_pipeline(org, brief, args)
            if not B.BOARD_FILE.exists():
                try:
                    run_planner(org, brief)
                except SystemExit:
                    print("[i] Pano henüz üretilemedi; sonraki tetiklemede denenecek.")
                    return
            if not B.BOARD_FILE.exists():
                print("[i] Tasarım henüz tamamlanmadı; sonraki tetiklemede devam edilecek.")
                return
        try:
            n = run_board(org, brief, once=args.tick,
                          max_tasks=args.max_tasks, max_cost=args.max_cost)
        except FileNotFoundError as e:
            # Zamanlanmış görev pano üretilmeden önce de tetiklenebilir;
            # log'u traceback'le doldurmadan sessizce çık.
            print(f"[i] {e}")
            return
        print(f"[i] Bu koşuda {n} görev yürütüldü.")
        return

    execute_pipeline(org, brief, args)


if __name__ == "__main__":
    main()
