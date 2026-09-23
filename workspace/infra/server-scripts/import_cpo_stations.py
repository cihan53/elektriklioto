#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL Pipeline: Normalizes ZES and Voltrun CPO datasets into canonical StationModel schema.
Matches with EPDK istasyonlar.json where applicable.
Outputs: workspace/src/backend/src/data/cpo_stations.json

Sprint: S15 — Canlı Kaynak Entegrasyonu (TALEP-017)
Özellikler:
1. Python 3.6+ tam geriye uyumluluk (CentOS 7, cPanel ve modern Linux ortamları).
2. Çoklu kaynaklı cURL entegrasyonu (Multi-source cURL parser: 'kaynak: curl ...').
3. Canlı API önceliği: Voltrun ve EPDK için canlı uç noktalar, ardından yerel cache ve uzak GitHub fallback.
4. Oturum sonlanma uyarı ve yönlendirme mekanizması (Session expiry guidance).
5. Sıfır-kayıt güvenlik kalkanı: Boş veri durumunda asla mevcut cpo_stations.json ezilmez.
6. Atomik dosya yazma (.tmp -> rename) ve otomatik geri dönüş (.bak) koruması.
"""

import os
import sys
import json
import re
import uuid
import ssl
import gzip
import zlib
import shlex
import urllib.request
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path

# Python 3.6+ Path resolve
ROOT = Path(__file__).resolve().parent.parent
BACKEND_DATA_DIR = ROOT / "workspace/src/backend/src/data"
BACKEND_DIST_DIR = ROOT / "workspace/src/backend/dist/data"

try:
    BACKEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

# ==============================================================================
# 1. Multi-source cURL Parser ve Canlı İstek Modülü (TALEP-017)
# ==============================================================================

def split_curl_sources(file_content: str) -> dict:
    """
    curl_input.txt dosyasını kaynak bazlı ayrıştırır.
    Desteklenen format:
      epdk: curl 'https://...'
      voltrun: curl 'https://...'
      zes: curl 'https://...'
    Kaynak öneki yoksa geriye dönük uyumluluk için 'epdk' kabul edilir.
    """
    sources = {}
    current_source = None
    current_lines = []

    if not file_content:
        return sources

    lines = file_content.strip().splitlines()
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        m = re.match(r"^([a-zA-Z0-9_-]+)\s*:\s*(.*)$", stripped)
        if m and (m.group(2).startswith("curl") or not m.group(2)):
            if current_source and current_lines:
                sources[current_source] = "\n".join(current_lines).strip()
            current_source = m.group(1).lower()
            rest = m.group(2).strip()
            current_lines = [rest] if rest else []
        else:
            if current_source:
                current_lines.append(line)
            else:
                current_source = "epdk"
                current_lines.append(line)

    if current_source and current_lines:
        sources[current_source] = "\n".join(current_lines).strip()

    return sources

def parse_curl_command(curl_text: str) -> dict:
    """
    Tek bir cURL komut metnini URL, HTTP methodu, başlıklar, body ve parametrelere ayrıştırır.
    """
    info = {
        "url": "",
        "method": "GET",
        "headers": {},
        "body": None,
        "data_params": {},
        "cookie": "",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:155.0) Gecko/20100101 Firefox/155.0",
        "view_state": "",
        "raw_curl": curl_text.strip() if curl_text else ""
    }

    if not curl_text:
        return info

    cleaned = re.sub(r'\\\r?\n\s*', ' ', curl_text.strip())

    try:
        tokens = shlex.split(cleaned)
    except Exception:
        tokens = cleaned.split()

    i = 0
    while i < len(tokens):
        t = tokens[i]

        if t == "curl":
            i += 1
            continue

        if t in ("-X", "--request") and i + 1 < len(tokens):
            info["method"] = tokens[i + 1].upper()
            i += 2
            continue

        if t in ("-H", "--header") and i + 1 < len(tokens):
            hdr = tokens[i + 1]
            if ":" in hdr:
                k, v = hdr.split(":", 1)
                k = k.strip()
                v = v.strip()
                info["headers"][k] = v
                kl = k.lower()
                if kl == "cookie":
                    info["cookie"] = v
                elif kl == "user-agent":
                    info["user_agent"] = v
            i += 2
            continue

        if t in ("-d", "--data", "--data-raw", "--data-binary", "--data-ascii") and i + 1 < len(tokens):
            info["body"] = tokens[i + 1]
            if info["method"] == "GET":
                info["method"] = "POST"
            i += 2
            continue

        if (t.startswith("http://") or t.startswith("https://")) and not info["url"]:
            info["url"] = t.strip("'\"")
            i += 1
            continue

        i += 1

    if info["body"]:
        try:
            params = urllib.parse.parse_qs(info["body"])
            info["data_params"] = {k: v[0] for k, v in params.items() if v}
            if "javax.faces.ViewState" in params and params["javax.faces.ViewState"]:
                info["view_state"] = params["javax.faces.ViewState"][0]
        except Exception:
            pass

    return info

def execute_curl(parsed_curl: dict, timeout: int = 15):
    """
    Ayrıştırılmış cURL komutunu urllib ile çalıştırır.
    Dönüş: (data, error_message)
    """
    url = parsed_curl.get("url")
    if not url:
        return None, "cURL komutunda URL bulunamadı."

    method = parsed_curl.get("method", "GET").upper()
    headers = dict(parsed_curl.get("headers", {}))
    body = parsed_curl.get("body")

    data_bytes = None
    if body is not None:
        if isinstance(body, str):
            data_bytes = body.encode("utf-8")
        elif isinstance(body, bytes):
            data_bytes = body

    if "Accept-Encoding" in headers:
        headers["Accept-Encoding"] = "gzip, deflate"

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw_bytes = resp.read()
            encoding = resp.headers.get("Content-Encoding", "").lower()
            if "gzip" in encoding:
                try:
                    raw_bytes = gzip.decompress(raw_bytes)
                except Exception:
                    pass
            elif "deflate" in encoding:
                try:
                    raw_bytes = zlib.decompress(raw_bytes)
                except Exception:
                    pass

            text = raw_bytes.decode("utf-8", errors="replace")

            try:
                data = json.loads(text)
                return data, None
            except json.JSONDecodeError:
                return text, None

    except urllib.error.HTTPError as e:
        return None, "HTTP {}: {}".format(e.code, e.reason)
    except urllib.error.URLError as e:
        return None, "Ağ Hatası: {}".format(e.reason)
    except Exception as e:
        return None, "İstek Hatası: {}".format(str(e))

class PrimeFacesHTMLTableParser(HTMLParser):
    """JSF / PrimeFaces tablo satırlarını HTML'den parse eder."""
    def __init__(self):
        super().__init__()
        self.rows = []
        self.current_row = None
        self.current_cell = None
        self.in_empty = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        classes = attr_dict.get("class", "").split()
        if tag == "tr":
            if any("empty-message" in c for c in classes):
                self.in_empty = True
                self.current_row = None
            else:
                self.in_empty = False
                self.current_row = []
        elif tag == "td" and self.current_row is not None and not self.in_empty:
            self.current_cell = []

    def handle_endtag(self, tag):
        if tag == "tr":
            if self.current_row is not None and len(self.current_row) >= 8:
                self.rows.append(self.current_row)
            self.current_row = None
            self.in_empty = False
        elif tag == "td":
            if self.current_cell is not None and self.current_row is not None:
                self.current_row.append(" ".join("".join(self.current_cell).split()))
                self.current_cell = None

    def handle_data(self, data):
        if self.current_cell is not None:
            self.current_cell.append(data)

def parse_epdk_partial_response(xml_content: str):
    """EPDK JSF partial-response XML çıktısını parse eder."""
    if not xml_content or not isinstance(xml_content, str):
        return [], "INVALID_XML"

    if "could not be restored" in xml_content or "ViewExpiredException" in xml_content:
        return [], "SESSION_EXPIRED"

    update_m = re.search(
        r'<update id="sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList"><!\[CDATA\[(.*?)\]\]></update>',
        xml_content,
        re.DOTALL,
    )
    if not update_m:
        return [], "NO_TABLE_UPDATE"

    html_data = update_m.group(1)
    if "Kayıt Bulunamadı" in html_data:
        return [], "EMPTY"

    parser = PrimeFacesHTMLTableParser()
    parser.feed(html_data)

    records = []
    for cells in parser.rows:
        if len(cells) >= 8:
            records.append({
                "istasyon_no": cells[0],
                "istasyon_adi": cells[1],
                "hizmet_sekli": cells[2],
                "marka": cells[3],
                "sarj_agi_isletmecisi": cells[4],
                "sarj_istasyonu_isletmecisi": cells[5],
                "adres": cells[6],
                "soket_bilgileri": cells[7],
            })
    return records, "OK"

# ==============================================================================
# 2. Coğrafi ve Metin Normalizasyon Fonksiyonları
# ==============================================================================

TURKISH_MAP = {
    'ı': 'i', 'İ': 'i', 'I': 'i', 'ş': 's', 'Ş': 's',
    'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u', 'ö': 'o',
    'Ö': 'o', 'ç': 'c', 'Ç': 'c'
}

def to_slug(text):
    if not text:
        return "istasyon"
    text = str(text)
    for tr, en in TURKISH_MAP.items():
        text = text.replace(tr, en)
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text or "istasyon"

TURKISH_CITIES = [
    "ADANA", "ADIYAMAN", "AFYONKARAHİSAR", "AĞRI", "AMASYA", "ANKARA", "ANTALYA", "ARTVİN",
    "AYDIN", "BALIKESİR", "BİLECİK", "BİNGÖL", "BİTLİS", "BOLU", "BURDUR", "BURSA", "ÇANAKKALE",
    "ÇANKIRI", "ÇORUM", "DENİZLİ", "DİYARBAKIR", "EDİRNE", "ELAZIĞ", "ERZİNCAN", "ERZURUM",
    "ESKİŞEHİR", "GAZİANTEP", "GİRESUN", "GÜMÜŞHANE", "HAKKARİ", "HATAY", "ISPARTA", "MERSİN",
    "İSTANBUL", "İZMİR", "KARS", "KASTAMONU", "KAYSERİ", "KIRKLARELİ", "KIRŞEHİR", "KOCAELİ",
    "KONYA", "KÜTAHYA", "MALATYA", "MANİSA", "KAHRAMANMARAŞ", "MARDİN", "MUĞLA", "MUŞ",
    "NEVŞEHİR", "NİĞDE", "ORDU", "RİZE", "SAKARYA", "SAMSUN", "SİİRT", "SİNOP", "SİVAS",
    "TEKİRDAĞ", "TOKAT", "TRABZON", "TUNCELİ", "ŞANLIURFA", "UŞAK", "VAN", "YOZGAT", "ZONGULDAK",
    "AKSARAY", "BAYBURT", "KARAMAN", "KIRIKKALE", "BATMAN", "ŞIRNAK", "BARTIN", "ARDAHAN",
    "IĞDIR", "YALOVA", "KARABÜK", "KİLİS", "OSMANİYE", "DÜZCE"
]

CITY_NORM = {}
for c in TURKISH_CITIES:
    clean = c.replace('İ', 'i').replace('I', 'i').title()
    CITY_NORM[c] = clean
    CITY_NORM[c.lower()] = clean
    CITY_NORM[clean] = clean
CITY_NORM["İzmi̇r"] = "İzmir"
CITY_NORM["Mersi̇n"] = "Mersin"
CITY_NORM["Kocaeli̇"] = "Kocaeli"

PROVINCE_COORDS = {
    "Adana": (37.0000, 35.3213), "Adıyaman": (37.7648, 38.2786), "Afyonkarahisar": (38.7507, 30.5567),
    "Ağrı": (39.7191, 43.0503), "Amasya": (40.6533, 35.8331), "Ankara": (39.9334, 32.8597),
    "Antalya": (36.8969, 30.7133), "Artvin": (41.1828, 41.8183), "Aydın": (37.8560, 27.8416),
    "Balıkesir": (39.6484, 27.8826), "Bilecik": (40.1451, 29.9799), "Bingöl": (38.8854, 40.4983),
    "Bitlis": (38.4006, 42.1095), "Bolu": (40.7392, 31.6089), "Burdur": (37.7203, 30.2908),
    "Bursa": (40.1885, 29.0610), "Çanakkale": (40.1553, 26.4142), "Çankırı": (40.6013, 33.6134),
    "Çorum": (40.5506, 34.9556), "Denizli": (37.7765, 29.0864), "Diyarbakır": (37.9144, 40.2306),
    "Edirne": (41.6818, 26.5623), "Elazığ": (38.6810, 39.2264), "Erzincan": (39.7500, 39.5000),
    "Erzurum": (39.9043, 41.2679), "Eskişehir": (39.7767, 30.5206), "Gaziantep": (37.0662, 37.3833),
    "Giresun": (40.9128, 38.3895), "Gümüşhane": (40.4600, 39.4700), "Hakkari": (37.5833, 43.7333),
    "Hatay": (36.2023, 36.1613), "Isparta": (37.7648, 30.5566), "Mersin": (36.8121, 34.6415),
    "İstanbul": (41.0082, 28.9784), "İzmir": (38.4237, 27.1428), "Kars": (40.6013, 43.0975),
    "Kastamonu": (41.3887, 33.7827), "Kayseri": (38.7312, 35.4787), "Kırklareli": (41.7333, 27.2167),
    "Kırşehir": (39.1425, 34.1709), "Kocaeli": (40.8533, 29.8815), "Konya": (37.8667, 32.4833),
    "Kütahya": (39.4167, 29.9833), "Malatya": (38.3552, 38.3095), "Manisa": (38.6191, 27.4289),
    "Kahramanmaraş": (37.5858, 36.9371), "Mardin": (37.3212, 40.7245), "Muğla": (37.2153, 28.3636),
    "Muş": (38.7432, 41.5064), "Nevşehir": (38.6244, 34.7239), "Niğde": (37.9667, 34.6833),
    "Ordu": (40.9839, 37.8764), "Rize": (41.0201, 40.5234), "Sakarya": (40.7569, 30.3783),
    "Samsun": (41.2928, 36.3313), "Siirt": (37.9333, 41.9500), "Sinop": (42.0231, 35.1531),
    "Sivas": (39.7477, 37.0179), "Tekirdağ": (40.9833, 27.5167), "Tokat": (40.3167, 36.5500),
    "Trabzon": (41.0015, 39.7178), "Tunceli": (39.1079, 39.5401), "Şanlıurfa": (37.1674, 38.7955),
    "Uşak": (38.6823, 29.4082), "Van": (38.4891, 43.4089), "Yozgat": (39.8181, 34.8147),
    "Zonguldak": (41.4564, 31.7987), "Aksaray": (38.3687, 34.0370), "Bayburt": (40.2552, 40.2249),
    "Karaman": (37.1759, 33.2287), "Kırıkkale": (39.8468, 33.5153), "Batman": (37.8812, 41.1293),
    "Şırnak": (37.5164, 42.4594), "Bartın": (41.6344, 32.3375), "Ardahan": (41.1105, 42.7022),
    "Iğdır": (39.9196, 44.0454), "Yalova": (40.6500, 29.2667), "Karabük": (41.2061, 32.6204),
    "Kilis": (36.7184, 37.1212), "Osmaniye": (37.0742, 36.2478), "Düzce": (40.8438, 31.1565)
}

def find_nearest_province(lat, lon):
    best_p = "İstanbul"
    min_d = float("inf")
    for p_name, coords in PROVINCE_COORDS.items():
        plat, plon = coords
        d = (plat - lat) ** 2 + (plon - lon) ** 2
        if d < min_d:
            min_d = d
            best_p = p_name
    return best_p

def normalize_city(raw, lat=None, lon=None):
    if not raw or str(raw).strip() in ('1', 'A', 'Bilinmeyen', 'None', '') or len(str(raw).strip()) <= 2:
        if lat and lon:
            return find_nearest_province(lat, lon)
        return "İstanbul"
    clean = str(raw).strip()
    norm = CITY_NORM.get(clean, CITY_NORM.get(clean.upper(), None))
    if norm:
        return norm
    if lat and lon:
        return find_nearest_province(lat, lon)
    return clean.title()

def extract_city_district_from_address(address, lat=None, lon=None):
    if not address:
        if lat and lon:
            return find_nearest_province(lat, lon), ""
        return "İstanbul", ""

    upper_addr = str(address).upper()
    for c_upper in TURKISH_CITIES:
        if re.search(r'\b' + re.escape(c_upper) + r'\b', upper_addr):
            return CITY_NORM.get(c_upper, c_upper.title()), ""

    if lat and lon:
        return find_nearest_province(lat, lon), ""

    return "İstanbul", ""

# ==============================================================================
# 3. Veri Seti Arama ve Uzak Yedekleme Fonksiyonları
# ==============================================================================

def fetch_remote_json(urls, timeout=15):
    """Python urllib ile uzak JSON verisini güvenle çeker."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; elektriklioto-sync/1.0; +https://elektriklioto.com)"
    }

    ctx = ssl.create_default_context()
    try:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    except Exception:
        pass

    for url in urls:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                if resp.status in (200, 206):
                    raw = resp.read().decode('utf-8', errors='replace')
                    data = json.loads(raw)
                    if data:
                        print("  ✓ Uzak kaynaktan veri alındı: {}".format(url))
                        return data
        except Exception as e:
            print("  [!] Uzak adres denendi ({}) : {}".format(url, e))
    return None

def load_json_dataset(candidate_names, remote_urls=None):
    """
    1. Aday yolları yerel diskte arar.
    2. Bulunamazsa verilen remote_urls listesinden veri indirmeyi dener.
    3. Hiçbiri olmazsa None döner.
    """
    search_dirs = [
        ROOT,
        ROOT / "server-scripts",
        ROOT / "scripts",
        ROOT / "data",
        ROOT / "workspace/src/backend/src/data",
        ROOT / "workspace/src/backend/dist/data",
        ROOT / "workspace",
        Path.cwd(),
        Path(__file__).resolve().parent,
        Path(__file__).resolve().parent.parent,
    ]

    for cname in candidate_names:
        for sdir in search_dirs:
            fpath = sdir / cname
            if fpath.exists() and fpath.is_file() and fpath.stat().st_size > 10:
                try:
                    with open(str(fpath), 'r', encoding='utf-8', errors='replace') as f:
                        data = json.load(f)
                        if data:
                            print("  ✓ Yerel dosya başarıyla yüklendi: {}".format(fpath))
                            return data
                except Exception as e:
                    print("  [!] Dosya okuma hatası ({}): {}".format(fpath, e))

    if remote_urls:
        print("  [i] Yerel dosya bulunamadı, uzak kaynaklar deneniyor: {}".format(candidate_names[0]))
        data = fetch_remote_json(remote_urls)
        if data:
            return data

    return None

def save_stations_atomically(stations):
    """
    İstasyon listesini atomik olarak cpo_stations.json dosyasına kaydeder.
    Sıfır-Kayıt Kalkanı: Eğer liste boşsa mevcut dosya ASLA ezilmez.
    """
    if not stations or len(stations) == 0:
        print("KRİTİK HATA: İstasyon sayısı 0! Güvenlik kalkanı devreye girdi.", file=sys.stderr)
        print("Mevcut veritabanı / cpo_stations.json dosyası KORUNDU ve ezilmedi.", file=sys.stderr)
        sys.exit(1)

    output_path = BACKEND_DATA_DIR / "cpo_stations.json"
    bak_path = BACKEND_DATA_DIR / "cpo_stations.json.bak"
    tmp_path = BACKEND_DATA_DIR / "cpo_stations.json.tmp"

    if output_path.exists() and output_path.stat().st_size > 100:
        try:
            with open(str(output_path), 'r', encoding='utf-8') as src, open(str(bak_path), 'w', encoding='utf-8') as dst:
                dst.write(src.read())
            print("  ✓ Mevcut veri cpo_stations.json.bak olarak yedeklendi.")
        except Exception as e:
            print("  [!] Yedekleme uyarısı: {}".format(e))

    content = json.dumps(stations, indent=2, ensure_ascii=False)
    with open(str(tmp_path), 'w', encoding='utf-8') as f:
        f.write(content)

    if not tmp_path.exists() or tmp_path.stat().st_size < 100:
        raise RuntimeError("Geçici dosya yazımı başarısız veya dosya boş!")

    if sys.platform == "win32":
        if output_path.exists():
            os.remove(str(output_path))
        os.rename(str(tmp_path), str(output_path))
    else:
        os.replace(str(tmp_path), str(output_path))

    try:
        BACKEND_DIST_DIR.mkdir(parents=True, exist_ok=True)
        dist_out = BACKEND_DIST_DIR / "cpo_stations.json"
        with open(str(dist_out), 'w', encoding='utf-8') as f:
            f.write(content)
        print("  ✓ Derlenmiş dist/data/cpo_stations.json senkronize edildi.")
    except Exception:
        pass

    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print("✓ BAŞARILI: {} istasyon atomik olarak kaydedildi ({:.2f} MB).".format(
        len(stations), file_size_mb
    ))
    return 0

# ==============================================================================
# 4. Ana Pipeline Senkronizasyon Akışı
# ==============================================================================

def main():
    print("========================================================")
    print("ETL Pipeline: CPO ve EPDK İstasyon Senkronizasyonu Başladı (TALEP-017)")
    print("========================================================")

    # 1. curl_input.txt dosyasını ara ve yükle (Çoklu Kaynak Formatı)
    curl_input_candidates = [
        ROOT / "curl_input.txt",
        Path.cwd() / "curl_input.txt",
        ROOT / "server-scripts/curl_input.txt",
        Path(__file__).resolve().parent / "curl_input.txt"
    ]
    curl_sources = {}
    for cand in curl_input_candidates:
        if cand.exists() and cand.is_file() and cand.stat().st_size > 10:
            try:
                with open(str(cand), "r", encoding="utf-8") as f:
                    curl_sources = split_curl_sources(f.read())
                print("  ✓ curl_input.txt yüklendi: {} ({} kaynak tespit edildi: {})".format(
                    cand.name, len(curl_sources), list(curl_sources.keys())
                ))
                break
            except Exception as e:
                print("  [!] curl_input.txt okunamadı ({}): {}".format(cand, e))

    # Gelecek CPO genişlemeleri için yeni kaynakları bildir
    known_keys = {"epdk", "voltrun", "zes"}
    for k in curl_sources:
        if k not in known_keys:
            print("  [i] Yeni dinamik kaynak tanımlı: '{}' (Gelecek CPO entegrasyonuna hazır).".format(k))

    # 2. VOLTRUN İSTASYONLARI (Canlı API -> Yerel Dosya -> Uzak GitHub Fallback)
    voltrun_raw = []
    if "voltrun" in curl_sources:
        print("  [i] Voltrun canlı API sorgulanıyor (curl_input.txt)...")
        parsed_v = parse_curl_command(curl_sources["voltrun"])
        v_data, v_err = execute_curl(parsed_v, timeout=15)
        if v_data:
            if isinstance(v_data, list) and len(v_data) > 0:
                voltrun_raw = v_data
            elif isinstance(v_data, dict):
                if "data" in v_data and isinstance(v_data["data"], list) and len(v_data["data"]) > 0:
                    voltrun_raw = v_data["data"]
                elif "stations" in v_data and isinstance(v_data["stations"], list) and len(v_data["stations"]) > 0:
                    voltrun_raw = v_data["stations"]

        if voltrun_raw:
            print("  ✓ Voltrun canlı API'sinden {} istasyon başarıyla çekildi.".format(len(voltrun_raw)))
        else:
            print("  ⚠️ UYARI: Voltrun canlı API isteği yanıt vermedi veya boş döndü (Hata: {}).".format(v_err or "Veri boş"))
            print("      curl_input.txt içindeki 'voltrun:' satırındaki uç noktayı ve parametreleri güncelleyebilirsiniz.")
            print("      -> Yerel önbellek / statik yedek zincirine geçiliyor...")

    if not voltrun_raw:
        voltrun_raw = load_json_dataset(
            candidate_names=["voltrun_stations.json", "voltrun.json"],
            remote_urls=[
                "https://raw.githubusercontent.com/cihan53/elektriklioto/master/voltrun_stations.json",
                "https://raw.githubusercontent.com/cihan53/elektriklioto/main/voltrun_stations.json",
            ]
        ) or []

    # 3. ZES İSTASYONLARI (Canlı API -> Yerel Dosya -> Uzak GitHub Fallback)
    zes_raw = []
    if "zes" in curl_sources:
        print("  [i] ZES canlı API sorgulanıyor (curl_input.txt)...")
        parsed_z = parse_curl_command(curl_sources["zes"])
        z_data, z_err = execute_curl(parsed_z, timeout=15)
        if z_data:
            if isinstance(z_data, dict) and "stations" in z_data and isinstance(z_data["stations"], list):
                zes_raw = z_data["stations"]
            elif isinstance(z_data, list):
                zes_raw = z_data
        if zes_raw:
            print("  ✓ ZES canlı API'sinden {} istasyon başarıyla çekildi.".format(len(zes_raw)))
        else:
            print("  ⚠️ UYARI: ZES canlı API isteği yanıt vermedi (Hata: {}).".format(z_err or "Veri boş"))
            print("      -> Yerel önbellek / statik yedek zincirine geçiliyor...")

    if not zes_raw:
        zes_raw_input = load_json_dataset(
            candidate_names=["zes_stations.json", "zes.json"],
            remote_urls=[
                "https://raw.githubusercontent.com/cihan53/elektriklioto/master/zes_stations.json",
                "https://raw.githubusercontent.com/cihan53/elektriklioto/main/zes_stations.json",
            ]
        ) or {}
        zes_raw = zes_raw_input.get("stations", []) if isinstance(zes_raw_input, dict) else (zes_raw_input if isinstance(zes_raw_input, list) else [])

    # 4. EPDK İSTASYONLARI (Canlı EPDK Portalı -> Yerel Checkpoint/JSON -> Uzak GitHub Fallback)
    epdk_raw = []
    if "epdk" in curl_sources:
        print("  [i] EPDK resmi portalı canlı denetleniyor (curl_input.txt)...")
        parsed_ep = parse_curl_command(curl_sources["epdk"])
        ep_data, ep_err = execute_curl(parsed_ep, timeout=15)
        if ep_data and isinstance(ep_data, str):
            ep_records, ep_status = parse_epdk_partial_response(ep_data)
            if ep_status == "OK" and len(ep_records) > 0:
                print("  ✓ EPDK resmi sitesinden canlı {} istasyon başarıyla çekildi.".format(len(ep_records)))
                epdk_raw = ep_records
            elif ep_status == "SESSION_EXPIRED":
                print("  ⚠️ UYARI: EPDK web oturumunun süresi dolmuş (Session / View Expired).")
                print("      epdk_scraper.py çalıştırılarak veya curl_input.txt içindeki 'epdk:' satırı güncellenerek canlı oturum tazelenebilir.")
                print("      -> Yerel veri deposu (istasyonlar.json / epdk_checkpoints) kullanılıyor...")
            elif ep_status in ("EMPTY", "NO_TABLE_UPDATE"):
                print("  ⚠️ UYARI: EPDK canlı sorgusundan aktif kayıt dönmedi (0 kayıt).")
                print("      -> Yerel veri deposu (istasyonlar.json / epdk_checkpoints) kullanılıyor...")
        elif ep_err:
            print("  ⚠️ UYARI: EPDK canlı portal isteği başarısız oldu ({}).".format(ep_err))
            print("      -> Yerel veri deposuna geçiliyor...")

    if not epdk_raw:
        # Checkpoint'leri kontrol et
        chk_dir = ROOT / "epdk_checkpoints"
        if chk_dir.exists():
            chk_records = []
            for pf in sorted(chk_dir.glob("page_*.json")):
                try:
                    with open(str(pf), "r", encoding="utf-8") as f:
                        pdata = json.load(f)
                        chk_records.extend(pdata.get("records", []))
                except Exception:
                    pass
            if len(chk_records) >= 1000:
                print("  ✓ EPDK checkpoint klasöründen {} istasyon yüklendi.".format(len(chk_records)))
                epdk_raw = chk_records

    if not epdk_raw:
        epdk_raw_input = load_json_dataset(
            candidate_names=["istasyonlar.json", "epdk_sarj_istasyonlari.json", "epdk.json"],
            remote_urls=[
                "https://raw.githubusercontent.com/cihan53/elektriklioto/master/istasyonlar.json",
                "https://raw.githubusercontent.com/cihan53/elektriklioto/main/istasyonlar.json",
            ]
        ) or {}
        epdk_raw = epdk_raw_input.get("istasyonlar", []) if isinstance(epdk_raw_input, dict) else (epdk_raw_input if isinstance(epdk_raw_input, list) else [])

    print("Yüklenen ham kayıtlar: Voltrun: {}, ZES: {}, EPDK: {}".format(
        len(voltrun_raw), len(zes_raw), len(epdk_raw)
    ))

    # Eğer hem Voltrun hem ZES boş geldiyse, mevcut geçerli snapshot'ı koru
    if len(voltrun_raw) == 0 and len(zes_raw) == 0:
        print("  [!] Ham CPO dosyaları bulunamadı! Mevcut cpo_stations.json snapshot'ı aranıyor...")
        existing_snapshot = load_json_dataset(
            candidate_names=["cpo_stations.json", "cpo_stations.json.bak"],
            remote_urls=[
                "https://raw.githubusercontent.com/cihan53/elektriklioto/master/workspace/src/backend/src/data/cpo_stations.json",
                "https://raw.githubusercontent.com/cihan53/elektriklioto/main/workspace/src/backend/src/data/cpo_stations.json",
            ]
        )
        if existing_snapshot and isinstance(existing_snapshot, list) and len(existing_snapshot) > 0:
            print("  ✓ Mevcut snapshot yüklendi: {} istasyon.".format(len(existing_snapshot)))
            save_stations_atomically(existing_snapshot)
            return 0
        else:
            print("KRİTİK HATA: Hiçbir kaynaktan veri alınamadı ve mevcut snapshot bulunamadı!", file=sys.stderr)
            sys.exit(1)

    # EPDK Lookup by brand
    epdk_by_brand = {}
    for ep in epdk_raw:
        brand = (ep.get("marka") or "").lower()
        epdk_by_brand.setdefault(brand, []).append(ep)

    normalized_stations = []
    used_slugs = set()

    def get_unique_slug(base):
        candidate = to_slug(base)
        if candidate not in used_slugs:
            used_slugs.add(candidate)
            return candidate
        idx = 2
        while "{}-{}".format(candidate, idx) in used_slugs:
            idx += 1
        res = "{}-{}".format(candidate, idx)
        used_slugs.add(res)
        return res

    # 1. PROCESS VOLTRUN
    if voltrun_raw:
        print("Voltrun istasyonları normalize ediliyor...")
        voltrun_locations = {}
        for v in voltrun_raw:
            lat = v.get("latitude")
            lon = v.get("longitude")
            if not lat or not lon:
                continue
            loc_key = v.get("locationId") or v.get("locationName") or "{:.4f},{:.4f}".format(float(lat), float(lon))
            voltrun_locations.setdefault(loc_key, []).append(v)

        voltrun_epdk = epdk_by_brand.get("voltrun", [])

        for loc_key, chargers in voltrun_locations.items():
            first = chargers[0]
            name = first.get("locationName") or first.get("businessName") or "Voltrun Şarj İstasyonu"
            lat = float(first["latitude"])
            lon = float(first["longitude"])
            city = normalize_city(first.get("city") or "", lat, lon)
            district = (first.get("district") or "").strip().title()
            address = first.get("addressDefinition") or "{}, {}".format(district, city)

            connector_types = set()
            max_power = 0
            current_tariff = None

            for c in chargers:
                for conn in c.get("connectors", []):
                    ctype = conn.get("type") or "AC"
                    if "ccs" in ctype.lower():
                        connector_types.add("CCS2")
                    elif "type" in ctype.lower() or "mennekes" in ctype.lower():
                        connector_types.add("Type 2")
                    elif "chademo" in ctype.lower():
                        connector_types.add("CHAdeMO")
                    else:
                        connector_types.add(ctype)
                    p = conn.get("maxPower") or c.get("maxPower") or 22
                    if p and p > max_power:
                        max_power = p

                et = c.get("energyTariff")
                if et and et.get("tariff") and not current_tariff:
                    try:
                        t_json = json.loads(et["tariff"])
                        if t_json and isinstance(t_json, list) and "unitPrice" in t_json[0]:
                            current_tariff = "{:.2f} TL/kWh".format(t_json[0]['unitPrice'])
                    except Exception:
                        pass

            istasyon_no = None
            for ep in voltrun_epdk:
                if to_slug(name) in to_slug(ep.get("istasyon_adi", "")):
                    istasyon_no = ep.get("istasyon_no")
                    break
            if not istasyon_no:
                istasyon_no = "VLT/{}".format(first.get('code') or first.get('stationCode') or first.get('id'))

            slug = get_unique_slug("voltrun-{}-{}".format(name, city))
            station_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "voltrun-{}".format(loc_key)))

            normalized_stations.append({
                "id": station_id,
                "istasyon_no": istasyon_no,
                "slug": slug,
                "name": name,
                "address": address,
                "city": city,
                "district": district,
                "lat": lat,
                "lon": lon,
                "operator_id": 4,
                "operator_name": "Voltrun",
                "is_flagged_defective": False,
                "defect_report_count": 0,
                "connector_types": sorted(list(connector_types)) if connector_types else ["Type 2"],
                "power_kw": max_power or 22,
                "current_tariff": current_tariff or "9.50 TL/kWh",
                "occupancy_status": "AVAILABLE" if any(c.get("stationOnline") for c in chargers) else "OCCUPIED",
                "open_hours": "24/7" if any(c.get("openHoursDefinition") for c in chargers) else "08:00 - 22:00",
                "service_type": "Halka Açık" if first.get("usageType") == "PUBLIC" else "Özel",
                "updated_at": "2026-09-18T12:00:00Z"
            })

        print("  ✓ Eklendi: {} Voltrun istasyon merkezi.".format(len(voltrun_locations)))

    # 2. PROCESS ZES
    if zes_raw:
        print("ZES istasyonları normalize ediliyor...")
        zes_count = 0
        zes_epdk = epdk_by_brand.get("zes", [])

        for z in zes_raw:
            lat = z.get("latitude")
            lon = z.get("longitude")
            if not lat or not lon:
                continue
            lat = float(lat)
            lon = float(lon)

            name = z.get("name") or "ZES Şarj İstasyonu"
            address = (z.get("address") or "").strip()
            zid = z.get("id") or z.get("externalId")

            city, district = extract_city_district_from_address(address, lat, lon)

            connector_types = []
            ac_count = z.get("acConnectorCount") or 0
            dc_count = z.get("dcConnectorCount") or 0
            hpc_count = z.get("hpcConnectorCount") or 0
            if ac_count > 0:
                connector_types.append("Type 2")
            if dc_count > 0 or hpc_count > 0:
                connector_types.append("CCS2")
            if not connector_types:
                connector_types.append("Type 2")

            max_power = z.get("maxElectricPower") or (120 if (dc_count or hpc_count) else 22)

            istasyon_no = None
            for ep in zes_epdk:
                if to_slug(name) in to_slug(ep.get("istasyon_adi", "")):
                    istasyon_no = ep.get("istasyon_no")
                    break
            if not istasyon_no:
                istasyon_no = "ZES/{}".format(zid)

            slug = get_unique_slug("zes-{}-{}".format(name, city))
            station_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "zes-{}".format(zid)))

            normalized_stations.append({
                "id": station_id,
                "istasyon_no": istasyon_no,
                "slug": slug,
                "name": name,
                "address": address or "{}, {}".format(district, city),
                "city": city,
                "district": district,
                "lat": lat,
                "lon": lon,
                "operator_id": 1,
                "operator_name": "ZES",
                "is_flagged_defective": bool(z.get("isInMaintenance")),
                "defect_report_count": 0,
                "connector_types": connector_types,
                "power_kw": max_power,
                "current_tariff": "10.49 TL/kWh" if "CCS2" in connector_types else "7.99 TL/kWh",
                "occupancy_status": "OFFLINE" if z.get("isInMaintenance") else "AVAILABLE",
                "open_hours": "24/7" if z.get("isOpenTwentyfourSeven") else "08:00 - 22:00",
                "service_type": "Özel" if z.get("isRestricted") else "Halka Açık",
                "updated_at": "2026-09-18T12:00:00Z"
            })
            zes_count += 1

        print("  ✓ Eklendi: {} ZES istasyonu.".format(zes_count))

    print("Toplam normalize edilen istasyon sayısı: {}".format(len(normalized_stations)))

    save_stations_atomically(normalized_stations)
    return 0

if __name__ == "__main__":
    sys.exit(main())
