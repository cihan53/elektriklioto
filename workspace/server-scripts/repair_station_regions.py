#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
server-scripts/repair_station_regions.py (Issue #56)
Mevcut cpo_stations.json kayitlarini kanonik il/ilce kod tabanina onarir:

  - city   -> kanonik Turkce il adi (PLAKA_TO_IL), ASCII varyantlar temizlenir
  - district -> resmi ilce adi; dogrulanamayan adres parcalari ("No:117" vb.) silinir
  - il_kodu / ilce_kodu alanlari eklenir
  - name/address/operator_name'deki U+0307 birlesik-nokta artifaktlari temizlenir

Ayrica station tablosu icin repair_regions.sql uretir (UPDATE ... FROM VALUES).
Kullanim:
    python3 workspace/server-scripts/repair_station_regions.py
    psql $DATABASE_URL -f workspace/server-scripts/repair_regions.sql
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from import_cpo_stations import (  # noqa: E402
    ROOT,
    PLAKA_TO_IL,
    COMBINING_DOT,
    clean_text,
    resolve_plaka,
    resolve_district_code,
)

# Script hem repo kokunde hem workspace/ altinda durabilir; iki duzeni de kapsa.
JSON_CANDIDATES = [
    ROOT / "src/backend/src/data/cpo_stations.json",
    ROOT / "workspace/src/backend/src/data/cpo_stations.json",
    ROOT / "src/backend/dist/data/cpo_stations.json",
    ROOT / "workspace/src/backend/dist/data/cpo_stations.json",
    ROOT / "server-scripts/data/cpo_stations.json",
    ROOT / "workspace/server-scripts/data/cpo_stations.json",
]

SQL_OUT = Path(__file__).resolve().parent / "repair_regions.sql"


def repair_record(item):
    """Tek istasyon kaydini onarir; degisiklik varsa True doner."""
    changed = False
    lat = item.get("lat")
    lon = item.get("lon")
    try:
        lat = float(lat)
        lon = float(lon)
    except (TypeError, ValueError):
        lat = lon = None

    plaka = resolve_plaka(item.get("city"), lat, lon)
    if plaka is None and lat is not None:
        plaka = resolve_plaka("", lat, lon)
    if plaka:
        canon = PLAKA_TO_IL.get(plaka)
        if canon and item.get("city") != canon:
            item["city"] = canon
            changed = True
        if item.get("il_kodu") != plaka:
            item["il_kodu"] = plaka
            changed = True

    ilce_kodu, district = resolve_district_code(
        plaka, item.get("district"), item.get("address"), lat, lon
    )
    if ilce_kodu:
        if item.get("ilce_kodu") != ilce_kodu:
            item["ilce_kodu"] = ilce_kodu
            changed = True
        if item.get("district") != district:
            item["district"] = district
            changed = True
    elif item.get("district"):
        # Dogrulanamayan cop ilce degerini bosalt ("No:117" vb.)
        item["district"] = ""
        item["ilce_kodu"] = None
        changed = True

    for field in ("name", "address", "operator_name", "district"):
        val = item.get(field)
        if isinstance(val, str) and COMBINING_DOT in val:
            cleaned = clean_text(val)
            if cleaned != val:
                item[field] = cleaned
                changed = True

    return changed


def sql_quote(v):
    return "'" + str(v).replace("'", "''") + "'"


def main():
    repaired_items = None
    max_items = []
    for cand in JSON_CANDIDATES:
        if not (cand.exists() and cand.stat().st_size > 100):
            continue
        try:
            with open(str(cand), "r", encoding="utf-8") as f:
                items = json.load(f)
            if not isinstance(items, list):
                continue
        except Exception as e:
            print("  [!] Okunamadi ({}): {}".format(cand, e))
            continue

        changed = sum(1 for it in items if repair_record(it))
        print("  ✓ {}: {} kayit, {} onarildi".format(cand.name, len(items), changed))
        content = json.dumps(items, indent=2, ensure_ascii=False)
        with open(str(cand), "w", encoding="utf-8") as f:
            f.write(content)
        if len(items) > len(max_items):
            max_items = items
            repaired_items = items

    if repaired_items is None:
        print("HATA: cpo_stations.json bulunamadi", file=sys.stderr)
        return 1
    items = repaired_items

    # station tablosu icin UPDATE ... FROM (VALUES ...) kalibi
    tuples = []
    for it in items:
        no = it.get("istasyon_no")
        if not no:
            continue
        il = it.get("il_kodu")
        ilce = it.get("ilce_kodu")
        tuples.append(
            "({}, {}, {}, {}, {})".format(
                sql_quote(no),
                "NULL" if il is None else int(il),
                "NULL" if ilce is None else int(ilce),
                sql_quote(it.get("city") or ""),
                sql_quote(it.get("district") or ""),
            )
        )

    SQL_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(str(SQL_OUT), "w", encoding="utf-8") as f:
        f.write("BEGIN;\n")
        chunk = 400
        for i in range(0, len(tuples), chunk):
            vals = ",\n".join(tuples[i : i + chunk])
            f.write(
                "UPDATE \"station\" s SET\n"
                "  il_kodu = v.il_kodu, ilce_kodu = v.ilce_kodu,\n"
                "  city = v.city, district = v.district\n"
                "FROM (VALUES\n" + vals + "\n) AS v(no, il_kodu, ilce_kodu, city, district)\n"
                "WHERE s.istasyon_no = v.no;\n"
            )
        f.write("COMMIT;\n")
    print("  ✓ SQL uretildi: {} ({} UPDATE blogu)".format(SQL_OUT, len(tuples) // 400 + 1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
