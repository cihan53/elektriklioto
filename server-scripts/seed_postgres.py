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
import subprocess
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_CANDIDATES = [
    ROOT / "workspace/src/backend/src/data/cpo_stations.json",
    ROOT / "cpo_stations.json",
    ROOT / "epdk_sarj_istasyonlari.json",
    ROOT / "istasyonlar.json"
]

OUTPUT_SQL = ROOT / "server-scripts" / "seed_data.sql"


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

    lines = [
        "-- ==============================================================================",
        "-- elektriklioto.com - İstasyon ve Konnektör Tohum Verisi (Otomatik Üretildi)",
        f"-- Toplam İstasyon: {len(stations)}",
        "-- ==============================================================================",
        "BEGIN;",
        ""
    ]

    seen_slugs = set()
    seen_nos = set()
    inserted_stations = 0
    connector_lines = []

    for idx, s in enumerate(stations):
        # Alanları normalize et
        ist_id = s.get("id")
        try:
            uuid.UUID(str(ist_id))
        except Exception:
            ist_id = str(uuid.uuid4())

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

        st_sql = (
            f"INSERT INTO \"station\" (id, istasyon_no, slug, operator_id, name, address, city, district, lat, lon, raw_metadata) VALUES "
            f"({sql_escape(ist_id)}, {sql_escape(ist_no)}, {sql_escape(slug)}, {op_id}, {sql_escape(name)}, "
            f"{sql_escape(address)}, {sql_escape(city)}, {sql_escape(district)}, {lat}, {lon}, {sql_escape(meta)}) "
            f"ON CONFLICT (istasyon_no) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, lat = EXCLUDED.lat, lon = EXCLUDED.lon;"
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
    try:
        res = subprocess.run(["psql", db_url, "-f", str(sql_file)], capture_output=True, text=True, timeout=120)
        if res.returncode == 0:
            print("✓ İstasyonlar veritabanına başarıyla aktarıldı!")
            return 0
        print(f"[!] psql çalıştırma uyarısı: {res.stderr[:200]}")
    except Exception as e:
        print(f"[!] psql komutu doğrudan çalıştırılamadı ({e}). Dosya 'server-scripts/seed_data.sql' olarak pgAdmin veya psql için hazır.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
