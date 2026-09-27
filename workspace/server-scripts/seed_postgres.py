#!/usr/bin/env python3
"""
scripts/seed_postgres.py
elektriklioto.com — PostgreSQL İstasyon ve Soket Veri Tohumlama

cpo_stations.json dosyasındaki normalize edilmiş 3600+ şarj istasyonunu
PostgreSQL veritabanına aktarır. Hem psql üzerinden doğrudan çalışır hem de
pgAdmin için 'scripts/seed_data.sql' çıktısı üretir.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path


def _find_psql() -> str | None:
    """psql'i PATH'te ve bilinen kurulum dizinlerinde ara (Homebrew/libpq, Postgres.app)."""
    found = shutil.which("psql")
    if found:
        return found
    for cand in (
        "/usr/local/opt/libpq/bin/psql",
        "/opt/homebrew/opt/libpq/bin/psql",
        "/usr/local/bin/psql",
        "/opt/homebrew/bin/psql",
        "/usr/bin/psql",
        "/Applications/Postgres.app/Contents/Versions/latest/bin/psql",
    ):
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return None

def _find_repo_root() -> Path:
    """server-scripts hem repo kökünde (cPanel) hem workspace/ içinde (git checkout)
    durabilir. 'workspace/src/backend' içeren ilk üst dizin repo kökü sayılır."""
    here = Path(__file__).resolve().parent
    for cand in (here, *here.parents):
        if (cand / "workspace" / "src" / "backend").is_dir():
            return cand
    return here.parent


ROOT = _find_repo_root()
DATA_CANDIDATES = [
    ROOT / "workspace/src/backend/src/data/cpo_stations.json",
    ROOT / "workspace/data/cpo_stations.json",
    ROOT / "workspace/data/istasyonlar.json",
    ROOT / "workspace/data/epdk_sarj_istasyonlari.json",
    ROOT / "cpo_stations.json",
    ROOT / "epdk_sarj_istasyonlari.json",
    ROOT / "istasyonlar.json"
]

OUTPUT_SQL = Path(__file__).resolve().parent / "seed_data.sql"

OPERATORS_FILE = ROOT / "workspace/src/backend/src/data/operators.json"


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
    OUTPUT_SQL.write_text("\n".join(lines), encoding="utf-8")
    print(f"[✓] Tohum SQL dosyası üretildi: {OUTPUT_SQL.relative_to(ROOT)} ({inserted_stations} istasyon)")
    return OUTPUT_SQL


def main():
    sql_file = generate_seed_sql()
    db_url = os.getenv("DATABASE_URL")
    if not (db_url and "postgres" in db_url):
        print("[i] 'server-scripts/seed_data.sql' dosyası hazırlandı. pgAdmin Query Tool veya psql ile içe aktarabilirsiniz.")
        return 1

    print(f"[i] DATABASE_URL algılandı, doğrudan psql üzerinden veritabanına aktarılıyor...")
    psql_bin = _find_psql()
    if not psql_bin:
        print(f"[!] psql bulunamadı (PATH ve bilinen dizinlerde yok). Dosya '{sql_file}' elle uygulanabilir.")
        return 1
    try:
        res = subprocess.run(
            [psql_bin, "-v", "ON_ERROR_STOP=1", db_url, "-f", str(sql_file)],
            capture_output=True, text=True, timeout=300,
        )
        if res.returncode == 0:
            print("✓ İstasyonlar veritabanına başarıyla aktarıldı!")
            return 0
        print(f"[!] psql çalıştırma uyarısı: {(res.stderr or res.stdout)[:500]}")
    except Exception as e:
        print(f"[!] psql komutu doğrudan çalıştırılamadı ({e}). Dosya 'server-scripts/seed_data.sql' olarak pgAdmin veya psql için hazır.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
