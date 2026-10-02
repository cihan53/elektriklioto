#!/usr/bin/env python3
"""
scripts/seed_postgres.py
elektriklioto.com — PostgreSQL İstasyon ve Soket Veri Tohumlama

cpo_stations.json dosyasındaki normalize edilmiş 3600+ şarj istasyonunu
PostgreSQL veritabanına aktarır. Hem psql üzerinden doğrudan çalışır hem de
pgAdmin için 'scripts/seed_data.sql' çıktısı üretir.
"""

import glob
import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from urllib.parse import unquote, urlparse, parse_qs


def _find_psql():
    """psql'i PATH'te ve bilinen kurulum dizinlerinde ara.

    macOS geliştirme (Homebrew/libpq, Postgres.app) ve Linux/cPanel paylaşımlı
    hosting (PostgreSQL.org paketleri, CloudLinux alt-pgsql, SCL, Debian
    çoklu-sürüm dizini) konumlarını kapsar.
    Python 3.6+ uyumludur.
    """
    found = shutil.which("psql")
    if found:
        return found
    candidates = [
        "/usr/local/opt/libpq/bin/psql",
        "/opt/homebrew/opt/libpq/bin/psql",
        "/usr/local/bin/psql",
        "/opt/homebrew/bin/psql",
        "/usr/bin/psql",
        "/Applications/Postgres.app/Contents/Versions/latest/bin/psql",
    ]
    # cPanel/CloudLinux ve çoklu-sürüm Linux kurulumları sürüm dizini kullanır;
    # glob ile hangi sürüm kuruluysa o yakalanır.
    for pattern in (
        "/usr/pgsql-*/bin/psql",
        "/usr/lib/postgresql/*/bin/psql",
        "/opt/rh/rh-postgresql*/root/usr/bin/psql",
        "/opt/alt/alt-pgsql*/root/usr/bin/psql",
        "/opt/alt/pgsql*/usr/bin/psql",
        "/opt/cpanel/ea-postgresql*/root/usr/bin/psql",
    ):
        candidates.extend(sorted(glob.glob(pattern), reverse=True))
    for cand in candidates:
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return None


def _find_repo_root():
    """server-scripts hem repo kökünde (cPanel) hem workspace/ içinde (git checkout)
    durabilir. 'workspace/src/backend' içeren ilk üst dizin repo kökü sayılır."""
    here = Path(__file__).resolve().parent
    for cand in (here, *here.parents):
        if (cand / "workspace" / "src" / "backend").is_dir():
            return cand
    return here.parent


ROOT = _find_repo_root()
SCRIPT_DIR = Path(__file__).resolve().parent

DATA_CANDIDATES = [
    ROOT / "workspace/src/backend/src/data/cpo_stations.json",
    ROOT / "workspace/data/cpo_stations.json",
    ROOT / "workspace/data/istasyonlar.json",
    ROOT / "workspace/data/epdk_sarj_istasyonlari.json",
    ROOT / "src/backend/src/data/cpo_stations.json",
    ROOT / "backend/src/data/cpo_stations.json",
    SCRIPT_DIR.parent / "workspace/src/backend/src/data/cpo_stations.json",
    SCRIPT_DIR.parent / "src/backend/src/data/cpo_stations.json",
    SCRIPT_DIR.parent / "backend/src/data/cpo_stations.json",
    ROOT / "cpo_stations.json",
    ROOT / "epdk_sarj_istasyonlari.json",
    ROOT / "istasyonlar.json"
]

OUTPUT_SQL = SCRIPT_DIR / "seed_data.sql"

OPERATOR_CANDIDATES = [
    ROOT / "workspace/src/backend/src/data/operators.json",
    ROOT / "src/backend/src/data/operators.json",
    ROOT / "backend/src/data/operators.json",
    SCRIPT_DIR.parent / "workspace/src/backend/src/data/operators.json",
    SCRIPT_DIR.parent / "src/backend/src/data/operators.json",
]


def _find_operators_file():
    for cand in OPERATOR_CANDIDATES:
        if cand.is_file():
            return cand
    return ROOT / "workspace/src/backend/src/data/operators.json"


OPERATORS_FILE = _find_operators_file()


def sql_escape(val) -> str:
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (dict, list)):
        dump = json.dumps(val, ensure_ascii=False).replace("'", "''")
        return f"'{dump}'::jsonb"
    s = str(val).replace("'", "''")
    return f"'{s}'"


def _slugify(text: str) -> str:
    tr = str.maketrans("çÇğĞıİöÖşŞüÜ", "cCgGiIoOsSuU")
    s = re.sub(r"[^a-z0-9]+", "-", text.translate(tr).lower()).strip("-")
    return s


def load_operators(stations: list) -> dict:
    """station.operator_id FK'si için gerekli operatör haritasını üretir.

    Birincil kaynak operators.json (slug/deep_link_config içerir); dosya yoksa
    veya bir operator_id eksikse istasyon kaydındaki operator_name'den türetilir.
    """
    ops = {}
    if OPERATORS_FILE.exists():
        try:
            for o in json.loads(OPERATORS_FILE.read_text(encoding="utf-8")):
                oid = int(o["id"])
                ops[oid] = {
                    "slug": str(o.get("slug") or f"op-{oid}"),
                    "name": str(o.get("name") or f"Operatör {oid}").strip()[:255],
                    "deep_link_config": o.get("deep_link_config"),
                    "is_active": bool(o.get("is_active", True)),
                }
            print(f"[i] {len(ops)} operatör operators.json'dan yüklendi.")
        except Exception as e:
            print(f"[!] operators.json okunamadı ({e}); operatörler istasyon verisinden türetilecek.")

    for s in stations:
        oid = s.get("operator_id")
        if oid is None:
            continue
        try:
            oid = int(oid)
        except (ValueError, TypeError):
            continue
        if oid not in ops:
            name = str(s.get("operator_name") or f"Operatör {oid}").strip()[:255]
            ops[oid] = {
                "slug": _slugify(name) or f"op-{oid}",
                "name": name,
                "deep_link_config": None,
                "is_active": True,
            }

    seen = set()
    for oid, o in ops.items():
        slug = o["slug"][:120]
        if slug in seen:
            slug = f"{slug[:110]}-{oid}"
        seen.add(slug)
        o["slug"] = slug
    return ops


def generate_seed_sql() -> Path:
    source_file = None
    for c in DATA_CANDIDATES:
        if c.exists():
            source_file = c
            break

    if not source_file:
        sys.exit("[HATA] İstasyon veri dosyası (cpo_stations.json) bulunamadı.")

    print(f"[i] İstasyon verisi okunuyor: {source_file.relative_to(ROOT)}")
    try:
        stations = json.loads(source_file.read_text(encoding="utf-8"))
    except Exception as e:
        sys.exit(f"[HATA] JSON dosyası okunamadı: {e}")

    operators = load_operators(stations)

    lines = [
        "-- ==============================================================================",
        "-- elektriklioto.com - İstasyon ve Konnektör Tohum Verisi (Otomatik Üretildi)",
        f"-- Toplam İstasyon: {len(stations)}",
        "-- ==============================================================================",
        "BEGIN;",
        ""
    ]

    # station.operator_id FK'si boş operator tablosunda tüm bloğu düşürür;
    # operatörler istasyonlardan ÖNCE upsert edilir.
    for oid in sorted(operators):
        o = operators[oid]
        lines.append(
            f"INSERT INTO \"operator\" (id, slug, name, deep_link_config, is_active) VALUES "
            f"({oid}, {sql_escape(o['slug'])}, {sql_escape(o['name'])}, "
            f"{sql_escape(o['deep_link_config'])}, {sql_escape(o['is_active'])}) "
            f"ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, "
            f"deep_link_config = EXCLUDED.deep_link_config, is_active = EXCLUDED.is_active;"
        )
    lines.append(
        "SELECT setval(pg_get_serial_sequence('operator', 'id'), (SELECT MAX(id) FROM \"operator\"));"
    )
    lines.append("")

    seen_slugs = set()
    seen_nos = set()
    seen_ids = set()
    inserted_stations = 0
    connector_lines = []

    for idx, s in enumerate(stations):
        # Alanları normalize et
        ist_id = s.get("id")
        try:
            uuid.UUID(str(ist_id))
        except Exception:
            ist_id = str(uuid.uuid4())

        # Kaynak veride aynı UUID birden fazla kayıtta görünebiliyor
        # (ör. EPDK birleşimi); PK çakışmasını önlemek için dedupe et.
        if ist_id in seen_ids:
            ist_id = str(uuid.uuid4())
        seen_ids.add(ist_id)

        ist_no = str(s.get("istasyon_no") or f"IST-{idx+1}").strip()
        slug = str(s.get("slug") or f"istasyon-{idx+1}").strip()

        # Yinelenen slug/istasyon no engelle
        if slug in seen_slugs:
            slug = f"{slug}-{idx+1}"
        seen_slugs.add(slug)

        if ist_no in seen_nos:
            ist_no = f"{ist_no}-{idx+1}"
        seen_nos.add(ist_no)

        name = str(s.get("name") or "Şarj İstasyonu").strip()
        address = str(s.get("address") or "").strip()[:500]
        city = str(s.get("city") or "Türkiye").strip()[:100]
        district = str(s.get("district") or "").strip()[:100]

        try:
            lat = round(float(s.get("lat") or 39.0), 6)
            lon = round(float(s.get("lon") or 35.0), 6)
        except (ValueError, TypeError):
            continue

        op_id = int(s.get("operator_id") or 1)
        meta = s.get("raw_metadata") or {}

        # Issue #56: il/ilce kanonik kodlari; metin alanlari goruntu icindir,
        # kimlik ve sorgulama bu kodlarla yapilir.
        try:
            il_kodu = int(s.get("il_kodu") or 0) or "NULL"
        except (ValueError, TypeError):
            il_kodu = "NULL"
        try:
            ilce_kodu = int(s.get("ilce_kodu") or 0) or "NULL"
        except (ValueError, TypeError):
            ilce_kodu = "NULL"

        st_sql = (
            f"INSERT INTO \"station\" (id, istasyon_no, slug, operator_id, name, address, city, district, il_kodu, ilce_kodu, lat, lon, raw_metadata) VALUES "
            f"({sql_escape(ist_id)}, {sql_escape(ist_no)}, {sql_escape(slug)}, {op_id}, {sql_escape(name)}, "
            f"{sql_escape(address)}, {sql_escape(city)}, {sql_escape(district)}, {il_kodu}, {ilce_kodu}, {lat}, {lon}, {sql_escape(meta)}) "
            f"ON CONFLICT (istasyon_no) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, "
            f"city = EXCLUDED.city, district = EXCLUDED.district, il_kodu = EXCLUDED.il_kodu, ilce_kodu = EXCLUDED.ilce_kodu, "
            f"lat = EXCLUDED.lat, lon = EXCLUDED.lon;"
        )
        lines.append(st_sql)
        inserted_stations += 1

        # Soketler / Konnektörler — günlük koşularda mükerrer birikmemesi için
        # istasyonun mevcut connector'ları önce silinir (connector'da UNIQUE yok).
        connectors = s.get("connector_types") or s.get("connectors") or []
        power = s.get("power_kw")
        if connectors:
            connector_lines.append(
                f"DELETE FROM \"connector\" WHERE station_id = {sql_escape(ist_id)};"
            )
            for c in connectors:
                c_type = str(c) if not isinstance(c, dict) else c.get("type", "Type 2")
                c_pwr = power if not isinstance(c, dict) else c.get("power_kw", power)
                current_type = "DC" if ("ccs" in c_type.lower() or "chademo" in c_type.lower()) else "AC"
                con_sql = (
                    f"INSERT INTO \"connector\" (station_id, socket_type, power_kw, current_type) VALUES "
                    f"({sql_escape(ist_id)}, {sql_escape(c_type)}, {c_pwr if c_pwr else 'NULL'}, '{current_type}');"
                )
                connector_lines.append(con_sql)

    lines.extend(connector_lines)
    lines.append("")
    lines.append("COMMIT;")
    lines.append("")

    OUTPUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    with open(str(OUTPUT_SQL), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"[✓] Tohum SQL dosyası üretildi: {OUTPUT_SQL} ({inserted_stations} istasyon)")
    return OUTPUT_SQL


def _split_sql_statements(sql_text: str):
    """Üretilen seed dosyasını tek tek SQL cümlelerine böler.

    `'` içindeki `;` ayraç sayılmaz, `''` kaçışı desteklenir; satır başı
    `--` yorumları atılır. Python 3.6+ uyumludur.
    """
    cleaned = "\n".join(
        line for line in sql_text.splitlines() if not line.lstrip().startswith("--")
    )
    stmts, buf, in_quote = [], [], False
    i = 0
    while i < len(cleaned):
        ch = cleaned[i]
        if in_quote:
            buf.append(ch)
            if ch == "'":
                if i + 1 < len(cleaned) and cleaned[i + 1] == "'":
                    buf.append("'")
                    i += 1
                else:
                    in_quote = False
        elif ch == "'":
            in_quote = True
            buf.append(ch)
        elif ch == ";":
            stmt = "".join(buf).strip()
            if stmt:
                stmts.append(stmt)
            buf = []
        else:
            buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        stmts.append(tail)
    return stmts


def _connect_python_driver(db_url: str):
    """Kurulu ilk saf-Python/DB-API PostgreSQL sürücüsüyle bağlantı açar.

    Sıra: psycopg (v3) -> psycopg2 -> pg8000. Hiçbiri yoksa (None, None).
    """
    try:
        import psycopg  # type: ignore

        return psycopg.connect(db_url, autocommit=True), "psycopg3"
    except Exception:
        pass
    try:
        import psycopg2  # type: ignore

        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        return conn, "psycopg2"
    except Exception:
        pass
    try:
        import pg8000.dbapi as pg8000  # type: ignore

        u = urlparse(db_url)
        sslmode = (parse_qs(u.query).get("sslmode") or [""])[0]
        kwargs = {
            "user": unquote(u.username or ""),
            "password": unquote(u.password or ""),
            "host": u.hostname or "localhost",
            "port": int(u.port or 5432),
            "database": u.path.lstrip("/"),
            "timeout": 300,
        }
        if sslmode and sslmode != "disable":
            import ssl
            kwargs["ssl_context"] = ssl.create_default_context()
        return pg8000.connect(**kwargs), "pg8000"
    except Exception:
        pass
    return None, None


def _apply_sql_with_python_driver(db_url: str, sql_file: Path):
    """psql bulunamazsa/başarısız olursa seed_data.sql'i Python sürücüsüyle uygular.

    Dönüş: True = başarılı, False = sürücü vardı ama aktarım hatası,
    None = hiç sürücü kurulu değil.
    """
    conn, driver = _connect_python_driver(db_url)
    if conn is None:
        return None
    with open(str(sql_file), "r", encoding="utf-8") as f:
        sql_content = f.read()
    statements = _split_sql_statements(sql_content)
    try:
        cur = conn.cursor()
        for stmt in statements:
            cur.execute(stmt)
        # Sadece autocommit kapalıysa commit çağrılır
        if not getattr(conn, "autocommit", False):
            conn.commit()
        print(f"[✓] İstasyonlar {driver} sürücüsüyle veritabanına aktarıldı ({len(statements)} SQL cümlesi).")
        return True
    except Exception as e:
        print(f"[!] {driver} ile aktarım başarısız: {str(e)[:500]}")
        try:
            if not getattr(conn, "autocommit", False):
                conn.rollback()
        except Exception:
            pass
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _find_node():
    """Node.js ikilisini PATH ve cPanel dizinlerinde ara."""
    found = shutil.which("node")
    if found:
        return found
    candidates = [
        "/usr/local/bin/node",
        "/usr/bin/node",
    ]
    for pattern in (
        "/opt/alt/nodejs*/bin/node",
        "/opt/alt/alt-nodejs*/root/usr/bin/node",
        os.path.expanduser("~/nodevenv/*/*/bin/node"),
    ):
        candidates.extend(sorted(glob.glob(pattern), reverse=True))
    for cand in candidates:
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return None


def _apply_sql_with_node(db_url: str, sql_file: Path):
    """psql ve Python DB sürücüleri yoksa, backend'deki kurulu postgres paketiyle uygular."""
    node_bin = _find_node()
    if not node_bin:
        return None
    here = Path(__file__).resolve().parent
    backend_candidates = [
        ROOT / "workspace/src/backend",
        ROOT / "src/backend",
        ROOT / "backend",
        here.parent / "workspace/src/backend",
        here.parent / "src/backend",
        here.parent / "backend",
    ]
    backend_dir = None
    for b in backend_candidates:
        if (b / "node_modules/postgres").is_dir() or (b / "package.json").is_file():
            backend_dir = b
            break
    if not backend_dir:
        return None

    node_script = """
const fs = require('fs');
const dbUrl = process.argv[1];
const sqlPath = process.argv[2];

async function main() {
  let postgres;
  try {
    postgres = require('postgres');
  } catch (e) {
    try {
      postgres = require('./node_modules/postgres');
    } catch (e2) {
      console.error('postgres modülü yüklenemedi:', e2.message);
      process.exit(2);
    }
  }
  const sql = postgres(dbUrl, { max: 1, idle_timeout: 30, connect_timeout: 30 });
  const content = fs.readFileSync(sqlPath, 'utf8');
  await sql.unsafe(content);
  await sql.end();
  console.log('✓ İstasyonlar Node.js (postgres.js) sürücüsüyle veritabanına aktarıldı.');
}

main().catch(err => {
  console.error('Node.js postgres aktarım hatası:', err.message || err);
  process.exit(1);
});
"""
    try:
        res = subprocess.run(
            [node_bin, "-e", node_script, db_url, str(sql_file)],
            cwd=str(backend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            timeout=300,
        )
        if res.returncode == 0:
            print("[✓] İstasyonlar Node.js sürücüsüyle veritabanına aktarıldı.")
            return True
        print(f"[!] Node.js çalıştırma uyarısı: {(res.stderr or res.stdout)[:500]}")
        return False
    except Exception as e:
        print(f"[!] Node.js komutu çalıştırılamadı ({e}).")
        return False


def _load_env_database_url():
    """Ortam değişkeni boşsa .env dosyalarından DATABASE_URL'i ara."""
    url = os.getenv("DATABASE_URL")
    if url and "postgres" in url:
        return url
    here = Path(__file__).resolve().parent
    candidates = [
        ROOT / ".env",
        ROOT / "workspace/src/backend/.env",
        ROOT / "src/backend/.env",
        ROOT / "backend/.env",
        here.parent / ".env",
        here.parent / "workspace/src/backend/.env",
    ]
    for cand in candidates:
        if cand.is_file():
            try:
                with open(str(cand), "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("DATABASE_URL="):
                            val = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if "postgres" in val:
                                return val
            except Exception:
                pass
    return None


def main():
    sql_file = generate_seed_sql()
    db_url = _load_env_database_url()
    if not (db_url and "postgres" in db_url):
        print("[i] 'server-scripts/seed_data.sql' dosyası hazırlandı. pgAdmin Query Tool veya psql ile içe aktarabilirsiniz.")
        return 1

    print("[i] DATABASE_URL algılandı, veritabanına aktarım başlatılıyor...")

    # psql için ortam değişkenlerini ayarla (şifre sorulmasını engellemek için)
    env = os.environ.copy()
    try:
        parsed = urlparse(db_url)
        if parsed.password:
            env["PGPASSWORD"] = unquote(parsed.password)
        if parsed.username:
            env["PGUSER"] = unquote(parsed.username)
        if parsed.hostname:
            env["PGHOST"] = parsed.hostname
        if parsed.port:
            env["PGPORT"] = str(parsed.port)
        if parsed.path:
            env["PGDATABASE"] = parsed.path.lstrip("/")
    except Exception:
        pass

    psql_bin = _find_psql()
    if psql_bin:
        try:
            res = subprocess.run(
                [psql_bin, "-v", "ON_ERROR_STOP=1", "-d", db_url, "-f", str(sql_file)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                env=env,
                timeout=300,
            )
            if res.returncode == 0:
                print("✓ İstasyonlar psql ile veritabanına başarıyla aktarıldı!")
                return 0
            print(f"[!] psql çalıştırma uyarısı: {(res.stderr or res.stdout)[:500]}")
        except Exception as e:
            print(f"[!] psql komutu doğrudan çalıştırılamadı ({e}).")

    # 2. Aşama: Python DB sürücüsü (psycopg3 / psycopg2 / pg8000)
    print("[i] Python PostgreSQL sürücüsü deneniyor...")
    res = _apply_sql_with_python_driver(db_url, sql_file)
    if res is True:
        return 0

    # 3. Aşama: Node.js (postgres.js) sürücüsü
    print("[i] Node.js PostgreSQL sürücüsü deneniyor...")
    res_node = _apply_sql_with_node(db_url, sql_file)
    if res_node is True:
        return 0

    print(f"[!] Otomatik aktarım tamamlanamadı. '{sql_file}' dosyası pgAdmin veya psql ile elle uygulanabilir.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
