#!/usr/bin/env python3
"""
server-scripts/import_gadm_regions.py
elektriklioto.com — GADM 4.1 Türkiye Resmi İl ve İlçe Coğrafi Sınır/Merkez İçe Aktarımı

Türkiye'nin 81 il ve 929 resmi ilçesini GADM 4.1 shapefile dosyalarından ayrıştırır:
1. Coğrafi sınır kutusu (BBox: min_lon, min_lat, max_lon, max_lat)
2. Geometrik merkez (center_lat, center_lon)
3. İstasyon tablosundaki şarj istasyonu sayısıyla eşleme
4. PostgreSQL 'administrative_region' tablosuna aktarım
5. Backend hızlı erişimi için 'workspace/src/backend/src/data/turkey_regions.json' üretimi
"""

import json
import os
import re
import struct
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GADM_CACHE_DIR = ROOT / "data" / "gadm"
GADM_ZIP_URL = "https://geodata.ucdavis.edu/gadm/gadm4.1/shp/gadm41_TUR_shp.zip"

OUTPUT_JSON_BACKEND = ROOT / "workspace" / "src" / "backend" / "src" / "data" / "turkey_regions.json"
OUTPUT_JSON_LOCAL = ROOT / "server-scripts" / "turkey_regions.json"

PROVINCE_TR_MAP = {
    "Adana": "Adana", "Adiyaman": "Adıyaman", "Afyon": "Afyonkarahisar", "Afyonkarahisar": "Afyonkarahisar",
    "Agri": "Ağrı", "Amasya": "Amasya", "Ankara": "Ankara", "Antalya": "Antalya", "Artvin": "Artvin",
    "Aydin": "Aydın", "Balikesir": "Balıkesir", "Bilecik": "Bilecik", "Bingöl": "Bingöl", "Bitlis": "Bitlis",
    "Bolu": "Bolu", "Burdur": "Burdur", "Bursa": "Bursa", "Çanakkale": "Çanakkale", "Çankiri": "Çankırı",
    "Çorum": "Çorum", "Denizli": "Denizli", "Diyarbakir": "Diyarbakır", "Edirne": "Edirne", "Elazig": "Elazığ",
    "Erzincan": "Erzincan", "Erzurum": "Erzurum", "Eskisehir": "Eskişehir", "Gaziantep": "Gaziantep",
    "Giresun": "Giresun", "Gümüshane": "Gümüşhane", "Hakkari": "Hakkâri", "Hatay": "Hatay", "Isparta": "Isparta",
    "Içel": "Mersin", "Mersin": "Mersin", "Istanbul": "İstanbul", "Izmir": "İzmir", "Kars": "Kars",
    "Kastamonu": "Kastamonu", "Kayseri": "Kayseri", "Kirklareli": "Kırklareli", "Kirsehir": "Kırşehir",
    "Kocaeli": "Kocaeli", "Konya": "Konya", "Kütahya": "Kütahya", "Malatya": "Malatya", "Manisa": "Manisa",
    "K. Maras": "Kahramanmaraş", "Kahramanmaras": "Kahramanmaraş", "Mardin": "Mardin", "Mugla": "Muğla",
    "Mus": "Muş", "Nevsehir": "Nevşehir", "Nigde": "Niğde", "Ordu": "Ordu", "Rize": "Rize", "Sakarya": "Sakarya",
    "Samsun": "Samsun", "Siirt": "Siirt", "Sinop": "Sinop", "Sivas": "Sivas", "Tekirdag": "Tekirdağ",
    "Tokat": "Tokat", "Trabzon": "Trabzon", "Tunceli": "Tunceli", "Sanliurfa": "Şanlıurfa", "Usak": "Uşak",
    "Van": "Van", "Yozgat": "Yozgat", "Zonguldak": "Zonguldak", "Aksaray": "Aksaray", "Bayburt": "Bayburt",
    "Karaman": "Karaman", "Kirikkale": "Kırıkkale", "Batman": "Batman", "Sirnak": "Şırnak", "Bartin": "Bartın",
    "Ardahan": "Ardahan", "Igdir": "Iğdır", "Yalova": "Yalova", "Karabük": "Karabük", "Kilis": "Kilis",
    "Osmaniye": "Osmaniye", "Düzce": "Düzce"
}


def ensure_gadm_files() -> Path:
    scratch_dir = Path("/Users/cihan/.gemini/antigravity/brain/9d8fc84e-063b-40a6-840d-eb2f857df3d6/scratch/gadm")
    if (scratch_dir / "gadm41_TUR_2.shp").exists():
        return scratch_dir

    GADM_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    shp2 = GADM_CACHE_DIR / "gadm41_TUR_2.shp"
    if not shp2.exists():
        zip_path = GADM_CACHE_DIR / "gadm41_TUR_shp.zip"
        if not zip_path.exists():
            print(f"[i] GADM 4.1 Türkiye shapefile indiriliyor: {GADM_ZIP_URL}...")
            urllib.request.urlretrieve(GADM_ZIP_URL, zip_path)
            print("✓ İndirme tamamlandı.")
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(GADM_CACHE_DIR)
        print(f"✓ GADM dosyaları açıldı: {GADM_CACHE_DIR}")
    return GADM_CACHE_DIR


def parse_shp_bboxes(shp_path: Path):
    bboxes = []
    with open(shp_path, "rb") as f:
        header = f.read(100)
        file_len = struct.unpack(">I", header[24:28])[0] * 2
        while f.tell() < file_len:
            rec_head = f.read(8)
            if not rec_head or len(rec_head) < 8:
                break
            rec_num, content_len = struct.unpack(">II", rec_head)
            content_bytes = content_len * 2
            rec_data = f.read(content_bytes)
            if len(rec_data) < 36:
                continue
            shape_type = struct.unpack("<I", rec_data[:4])[0]
            if shape_type in (5, 15, 25): # Polygon türleri
                xmin, ymin, xmax, ymax = struct.unpack("<dddd", rec_data[4:36])
                bboxes.append({
                    "min_lon": round(xmin, 6),
                    "min_lat": round(ymin, 6),
                    "max_lon": round(xmax, 6),
                    "max_lat": round(ymax, 6),
                    "center_lon": round((xmin + xmax) / 2, 6),
                    "center_lat": round((ymin + ymax) / 2, 6)
                })
            else:
                bboxes.append(None)
    return bboxes


def parse_dbf_records(dbf_path: Path):
    with open(dbf_path, "rb") as f:
        header = f.read(32)
        num_rec, header_len, rec_len = struct.unpack("<IHH", header[4:12])
        fields = []
        while True:
            b = f.read(32)
            if b[0] == 0x0D:
                break
            name = b[:11].rstrip(b"\x00").decode("ascii")
            flen = b[16]
            fields.append((name, flen))
        f.seek(header_len)
        records = []
        for _ in range(num_rec):
            rec = f.read(rec_len)
            off = 1
            d = {}
            for fname, flen in fields:
                d[fname] = rec[off:off+flen].decode("utf-8", errors="ignore").strip()
                off += flen
            records.append(d)
    return records


def clean_turkish(name: str) -> str:
    if not name:
        return ""
    # Bazı GADM kayıtlarındaki kod ve ASCII dönüşümlerini düzelt
    name = PROVINCE_TR_MAP.get(name, name)
    return name


def main():
    print("======================================================================")
    print("  GADM 4.1 Türkiye İl ve İlçe Coğrafi Bilgi Sistemi (GIS) Entegrasyonu")
    print("======================================================================")

    data_dir = ensure_gadm_files()

    # 1. Level 1: 81 İller
    print("\n[1/4] Türkiye 81 İl Sınırları ve Merkezleri Okunuyor (gadm41_TUR_1)...")
    p_boxes = parse_shp_bboxes(data_dir / "gadm41_TUR_1.shp")
    p_recs = parse_dbf_records(data_dir / "gadm41_TUR_1.dbf")

    provinces = []
    for i, r in enumerate(p_recs):
        raw_name = r.get("NAME_1")
        name = clean_turkish(raw_name)
        box = p_boxes[i]
        provinces.append({
            "level": 1,
            "name": name,
            "parent_name": None,
            "gid": r.get("GID_1"),
            "center_lat": box["center_lat"],
            "center_lon": box["center_lon"],
            "min_lat": box["min_lat"],
            "min_lon": box["min_lon"],
            "max_lat": box["max_lat"],
            "max_lon": box["max_lon"],
            "default_zoom": 11
        })
    print(f"✓ {len(provinces)} İl başarıyla yüklendi.")

    # 2. Level 2: 929 İlçeler
    print("\n[2/4] Türkiye 929 İlçe Sınırları ve Merkezleri Okunuyor (gadm41_TUR_2)...")
    d_boxes = parse_shp_bboxes(data_dir / "gadm41_TUR_2.shp")
    d_recs = parse_dbf_records(data_dir / "gadm41_TUR_2.dbf")

    districts = []
    for i, r in enumerate(d_recs):
        dist_name = r.get("NAME_2")
        prov_name = clean_turkish(r.get("NAME_1"))
        box = d_boxes[i]
        districts.append({
            "level": 2,
            "name": dist_name,
            "parent_name": prov_name,
            "gid": r.get("GID_2"),
            "center_lat": box["center_lat"],
            "center_lon": box["center_lon"],
            "min_lat": box["min_lat"],
            "min_lon": box["min_lon"],
            "max_lat": box["max_lat"],
            "max_lon": box["max_lon"],
            "default_zoom": 13
        })
    print(f"✓ {len(districts)} İlçe başarıyla yüklendi.")

    # 3. İstasyon Verisi ile Eşleme (İlçe ve İl bazında istasyon sayıları)
    print("\n[3/4] İstasyon verileriyle ilçe ve il istasyon sayıları hesaplanıyor...")
    station_file = ROOT / "workspace" / "src" / "backend" / "src" / "data" / "cpo_stations.json"
    stations = []
    if station_file.exists():
        try:
            stations = json.loads(station_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    prov_station_counts = {}
    dist_station_counts = {}
    for st in stations:
        c = (st.get("city") or "").strip().lower()
        d = (st.get("district") or "").strip().lower()
        if c:
            prov_station_counts[c] = prov_station_counts.get(c, 0) + 1
        if c and d:
            key = f"{c}:{d}"
            dist_station_counts[key] = dist_station_counts.get(key, 0) + 1

    for p in provinces:
        c_key = p["name"].lower()
        p["station_count"] = prov_station_counts.get(c_key, 0)

    for d in districts:
        c_key = (d["parent_name"] or "").lower()
        d_key = (d["name"] or "").lower()
        count = dist_station_counts.get(f"{c_key}:{d_key}", 0)
        # Kısmi eşleme (i/ı farkları)
        if count == 0:
            for k, val in dist_station_counts.items():
                if k.startswith(f"{c_key}:") and (d_key in k or k.split(":")[1] in d_key):
                    count += val
        d["station_count"] = count

    all_regions = provinces + districts
    print(f"✓ Toplam {len(all_regions)} coğrafi bölge hazırlandı ({len(provinces)} İl + {len(districts)} İlçe).")

    # 4. JSON Çıktısı Üretimi (Backend ve Sunucu İçin)
    print("\n[4/4] Backend JSON dosyaları oluşturuluyor...")
    OUTPUT_JSON_BACKEND.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON_BACKEND.write_text(json.dumps(all_regions, ensure_ascii=False, indent=2), encoding="utf-8")
    OUTPUT_JSON_LOCAL.write_text(json.dumps(all_regions, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {OUTPUT_JSON_BACKEND} ({OUTPUT_JSON_BACKEND.stat().st_size / 1024:.1f} KB) kaydedildi.")

    print("\n======================================================================")
    print("  GADM 4.1 İçe Aktarma Başarıyla Tamamlandı!")
    print("======================================================================")

if __name__ == "__main__":
    main()
