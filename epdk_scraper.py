#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPDK Şarj İstasyonları Otomatik İndirici (Scraper)
-------------------------------------------------
EPDK web sitesindeki (JSF / PrimeFaces) şarj istasyonları listesini sayfa sayfa
(500'er kayıt) indirerek JSON ve CSV formatına dönüştürür.
Sunucuya aşırı yük bindirmemek (anti-DDOS) için istekler arasına 20 saniye gecikme koyar.
Kesinti durumunda kaldığı yerden devam edebilmesi için checkpoint (ara kayıt) mekanizması içerir.
Sıfır harici bağımlılık: requests veya bs4 yoksa standart kütüphane (urllib, html.parser) ile çalışır.
"""

import sys
import os
import re
import time
import json
import csv
import ssl
import gzip
import zlib
import argparse
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from datetime import datetime

# Opsiyonel harici kütüphaneler (varsa kullanılır, yoksa standart kütüphane devrededir)
try:
    import requests
    RequestException = requests.RequestException
except ImportError:
    requests = None
    RequestException = Exception

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None


DEFAULT_URL = (
    "https://lisans.epdk.gov.tr/epvys-web/faces/pages/lisans/"
    "elektrikSarjAgiIsletmeci/sarjIstasyonuOzetSorgula.xhtml"
)
DEFAULT_DELAY = 20  # saniye
DEFAULT_ROWS = 500  # sayfa başı kayıt sayısı
TOTAL_ESTIMATED = 16788


def split_curl_sources(file_content: str) -> dict:
    """
    curl_input.txt dosyasını kaynak bazlı ayrıştırır.
    Desteklenen format:
      epdk: curl 'https://...'
      voltrun: curl 'https://...'
      zes: curl 'https://...'
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
    """cURL komut metninden URL, Cookie, User-Agent ve ViewState değerlerini ayıklar."""
    info = {
        "url": DEFAULT_URL,
        "cookie": "",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:155.0) Gecko/20100101 Firefox/155.0",
        "view_state": "",
    }

    if not curl_text:
        return info

    # Çoklu kaynak desteği: Eğer metin birden fazla kaynak içeriyorsa 'epdk' bloğunu al
    sources = split_curl_sources(curl_text)
    if "epdk" in sources:
        curl_text = sources["epdk"]

    # URL tespiti
    url_m = re.search(r"curl\s+['\"]?([^'\"\s]+)['\"]?", curl_text)
    if url_m:
        info["url"] = url_m.group(1)

    # Cookie tespiti
    cookie_m = re.search(r"-H\s+['\"]Cookie:\s*([^'\"]+)['\"]", curl_text, re.IGNORECASE)
    if cookie_m:
        info["cookie"] = cookie_m.group(1).strip()

    # User-Agent tespiti
    ua_m = re.search(r"-H\s+['\"]User-Agent:\s*([^'\"]+)['\"]", curl_text, re.IGNORECASE)
    if ua_m:
        info["user_agent"] = ua_m.group(1).strip()

    # ViewState tespiti (--data-raw veya -d içinden)
    data_m = re.search(
        r"(?:--data-raw|--data|-d|--data-binary)\s+['\"]([^'\"]+)['\"]", curl_text
    )
    if data_m:
        raw_body = data_m.group(1)
        params = urllib.parse.parse_qs(raw_body)
        if "javax.faces.ViewState" in params:
            info["view_state"] = params["javax.faces.ViewState"][0]

    return info


class PrimeFacesHTMLTableParser(HTMLParser):
    """Standart Python HTMLParser ile PrimeFaces JSF tablo satırlarını ayrıştırır."""
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


def parse_table_xml(xml_content: str):
    """
    JSF Partial-response XML'ini ayrıştırır.
    Dönen HTML tablosundaki kayıtları ve güncel ViewState'i çıkartır.
    """
    # Güncel ViewState güncellemesi varsa yakala
    new_view_state = None
    vs_m = re.search(r'<update id="javax\.faces\.ViewState"><!\[CDATA\[(.*?)\]\]></update>', xml_content, re.DOTALL)
    if vs_m:
        new_view_state = vs_m.group(1).strip()

    # Hata veya oturum sonlanma kontrolü
    if "could not be restored" in xml_content or "ViewExpiredException" in xml_content:
        return None, new_view_state, "SESSION_EXPIRED"

    # Tablo HTML'ini bul
    html_data = None
    update_m = re.search(
        r'<update id="sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList"><!\[CDATA\[(.*?)\]\]></update>',
        xml_content,
        re.DOTALL,
    )
    if update_m:
        html_data = update_m.group(1)

    if not html_data:
        if BeautifulSoup:
            soup = BeautifulSoup(xml_content, "html.parser")
            update_node = soup.find("update", {"id": "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList"})
            if update_node:
                html_data = update_node.text

    if not html_data:
        return [], new_view_state, "NO_TABLE_UPDATE"

    if "Kayıt Bulunamadı" in html_data:
        return [], new_view_state, "OK"

    rows = []
    if BeautifulSoup:
        table_soup = BeautifulSoup(html_data, "html.parser")
        tr_elements = table_soup.find_all("tr")
        for tr in tr_elements:
            classes = tr.get("class", [])
            if any("empty-message" in c for c in classes):
                continue
            tds = tr.find_all("td")
            if not tds or len(tds) < 8:
                continue
            cells = [td.get_text(separator=" ", strip=True) for td in tds]
            record = {
                "istasyon_no": cells[0],
                "istasyon_adi": cells[1],
                "hizmet_sekli": cells[2],
                "marka": cells[3],
                "sarj_agi_isletmecisi": cells[4],
                "sarj_istasyonu_isletmecisi": cells[5],
                "adres": cells[6],
                "soket_bilgileri": cells[7],
            }
            rows.append(record)
    else:
        parser = PrimeFacesHTMLTableParser()
        parser.feed(html_data)
        for cells in parser.rows:
            if len(cells) >= 8:
                record = {
                    "istasyon_no": cells[0],
                    "istasyon_adi": cells[1],
                    "hizmet_sekli": cells[2],
                    "marka": cells[3],
                    "sarj_agi_isletmecisi": cells[4],
                    "sarj_istasyonu_isletmecisi": cells[5],
                    "adres": cells[6],
                    "soket_bilgileri": cells[7],
                }
                rows.append(record)

    return rows, new_view_state, "OK"


class StandardHttpSession:
    """Python urllib tabanlı oturum yöneticisi (requests alternatifi, sıfır kütüphane bağımlılığı)."""
    def __init__(self):
        self.headers = {}

    def post(self, url, headers=None, data=None, timeout=45):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req_headers = dict(self.headers)
        if headers:
            req_headers.update(headers)
        if "Accept-Encoding" in req_headers:
            req_headers["Accept-Encoding"] = "gzip, deflate"

        encoded_data = None
        if data is not None:
            if isinstance(data, dict):
                encoded_data = urllib.parse.urlencode(data).encode("utf-8")
            elif isinstance(data, str):
                encoded_data = data.encode("utf-8")
            elif isinstance(data, bytes):
                encoded_data = data

        req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method="POST")

        class SimpleResponse:
            def __init__(self, code, text):
                self.status_code = code
                self.text = text
                self.encoding = "utf-8"

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
                return SimpleResponse(resp.status, text)
        except urllib.error.HTTPError as e:
            err_text = ""
            try:
                err_text = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            return SimpleResponse(e.code, err_text)


def wait_with_countdown(seconds: int):
    """Kullanıcı dostu geri sayım göstererek bekler."""
    for remaining in range(seconds, 0, -1):
        sys.stdout.write(f"\r⏳ DDOS koruması: Sonraki istek için bekleniyor: {remaining:2d} sn...")
        sys.stdout.flush()
        time.sleep(1)
    sys.stdout.write("\r" + " " * 65 + "\r")
    sys.stdout.flush()


def prompt_for_fresh_credentials(current_curl_file: str = "curl_input.txt") -> dict:
    """Oturum süresi dolduğunda kullanıcıdan yeni istek bilgilerini alır."""
    print("\n" + "=" * 70)
    print("⚠️  DİKKAT: EPDK Oturumunun Süresi Dolmuş (Session Expired / View Expired)")
    print("=" * 70)
    print("Çözüm için:")
    print("1. Tarayıcınızda (Chrome / Firefox vb.) EPDK sayfasını açın / yenileyin ve arama yapın:")
    print(f"   {DEFAULT_URL}")
    print("2. F12 Ağ (Network) sekmesinde 'sarjIstasyonuOzetSorgula.xhtml' isteğine sağ tıklayıp")
    print("   'Copy as cURL' (cURL olarak kopyala) seçin.")
    print(f"3. Kopyalanan komutu '{current_curl_file}' dosyasına yapıştırıp kaydedin.")
    print("   (Çoklu kaynak kullanıyorsanız 'epdk: curl ...' formatında tutunuz)")
    print("   VEYA aşağıya yapıştırıp [ENTER] tuşuna basın.")
    print("=" * 70)

    if not sys.stdin.isatty():
        print(f"🛑 Etkileşimsiz ortam tespit edildi. Lütfen '{current_curl_file}' dosyasını güncel cURL komutunuzla güncelleyip betiği yeniden çalıştırın.")
        sys.exit(1)

    print("\nYeni cURL komutunu yapıştırın (veya dosyayı güncellediyseniz boş bırakıp ENTER'a basın):")
    pasted_lines = []
    try:
        while True:
            line = input()
            if not line.strip() and not pasted_lines:
                if os.path.exists(current_curl_file):
                    with open(current_curl_file, "r", encoding="utf-8") as f:
                        file_content = f.read()
                    parsed = parse_curl_command(file_content)
                    if parsed.get("cookie") and parsed.get("view_state"):
                        return parsed
                print("⚠️ Dosyada geçerli Cookie veya ViewState bulunamadı. Lütfen cURL komutunu yapıştırın:")
                continue
            if not line.strip() and pasted_lines:
                break
            pasted_lines.append(line)
            if len(pasted_lines) == 1 and pasted_lines[0].strip().startswith("curl ") and "--data" in pasted_lines[0]:
                break
    except (EOFError, KeyboardInterrupt):
        print("\nİşlem iptal edildi.")
        sys.exit(1)

    full_text = "\n".join(pasted_lines)
    try:
        if os.path.exists(current_curl_file):
            with open(current_curl_file, "r", encoding="utf-8") as f:
                existing = f.read()
            sources = split_curl_sources(existing)
            sources["epdk"] = full_text
            new_file_content = []
            for src, cmd in sources.items():
                new_file_content.append(f"{src}: {cmd}\n")
            with open(current_curl_file, "w", encoding="utf-8") as f:
                f.write("\n".join(new_file_content))
        else:
            with open(current_curl_file, "w", encoding="utf-8") as f:
                f.write(f"epdk: {full_text}\n")
        print(f"💾 '{current_curl_file}' güncellendi.")
    except Exception:
        pass

    return parse_curl_command(full_text)


def save_merged_outputs(all_records: list, output_json: str, output_csv: str):
    """Tüm kayıtları JSON ve CSV olarak kaydeder."""
    brand_stats = {}
    for r in all_records:
        marka = (r.get("marka") or "").strip()
        isletmeci = (r.get("sarj_agi_isletmecisi") or "").strip()
        if not marka:
            continue
        if marka not in brand_stats:
            brand_stats[marka] = {
                "marka": marka,
                "istasyon_sayisi": 0,
                "isletmeciler": set()
            }
        brand_stats[marka]["istasyon_sayisi"] += 1
        if isletmeci:
            brand_stats[marka]["isletmeciler"].add(isletmeci)

    companies = [
        {
            "marka": v["marka"],
            "istasyon_sayisi": v["istasyon_sayisi"],
            "isletmeciler": sorted(list(v["isletmeciler"])),
        }
        for v in sorted(brand_stats.values(), key=lambda x: x["istasyon_sayisi"], reverse=True)
    ]
    marka_listesi = sorted(list(brand_stats.keys()))

    output_data = {
        "metadata": {
            "kayit_sayisi": len(all_records),
            "toplam_tekil_marka": len(companies),
            "guncelleme_tarihi": datetime.now().isoformat(),
            "kaynak": "EPDK Şarj İstasyonları Sorgulama Sistemi",
            "url": DEFAULT_URL,
        },
        "companies": companies,
        "markalar": marka_listesi,
        "istasyonlar": all_records,
    }
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    if output_csv and all_records:
        fieldnames = [
            "istasyon_no",
            "istasyon_adi",
            "hizmet_sekli",
            "marka",
            "sarj_agi_isletmecisi",
            "sarj_istasyonu_isletmecisi",
            "adres",
            "soket_bilgileri",
        ]
        with open(output_csv, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in all_records:
                writer.writerow(r)


def main():
    parser = argparse.ArgumentParser(description="EPDK Şarj İstasyonları Otomatik Veri Çekici")
    parser.add_argument("--curl-file", default="curl_input.txt", help="cURL komutunun bulunduğu dosya")
    parser.add_argument("--curl", default="", help="Doğrudan cURL komutu string olarak")
    parser.add_argument("--cookie", default="", help="Özel Cookie değeri")
    parser.add_argument("--viewstate", default="", help="İlk javax.faces.ViewState değeri")
    parser.add_argument("--delay", type=int, default=DEFAULT_DELAY, help="İstekler arası bekleme süresi (sn)")
    parser.add_argument("--rows", type=int, default=DEFAULT_ROWS, help="Sayfa başı kayıt sayısı (varsayılan: 500)")
    parser.add_argument("--output", default="epdk_sarj_istasyonlari.json", help="Çıktı JSON dosyası")
    parser.add_argument("--output-csv", default="epdk_sarj_istasyonlari.csv", help="Çıktı CSV dosyası")
    parser.add_argument("--checkpoint-dir", default="epdk_checkpoints", help="Sayfa ara kayıt dizini")
    parser.add_argument("--no-resume", action="store_true", help="Önceki ara kayıtları yok say ve baştan başla")
    args = parser.parse_args()

    checkpoint_path = Path(args.checkpoint_dir)
    checkpoint_path.mkdir(parents=True, exist_ok=True)

    # Bilgileri topla
    curl_text = args.curl
    if not curl_text and os.path.exists(args.curl_file):
        with open(args.curl_file, "r", encoding="utf-8") as f:
            curl_text = f.read()

    cred = parse_curl_command(curl_text) if curl_text else {}
    cookie = args.cookie or cred.get("cookie", "")
    view_state = args.viewstate or cred.get("view_state", "")
    user_agent = cred.get("user_agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:155.0) Gecko/20100101")
    url = cred.get("url", DEFAULT_URL)

    if not cookie or not view_state:
        print("❌ Hata: Geçerli Cookie veya ViewState bulunamadı!")
        cred = prompt_for_fresh_credentials(args.curl_file)
        cookie = cred.get("cookie", "")
        view_state = cred.get("view_state", "")
        user_agent = cred.get("user_agent", user_agent)

    # Mevcut ara kayıtları kontrol et (Resume modu)
    existing_pages = {}
    if not args.no_resume:
        for f in checkpoint_path.glob("page_*.json"):
            try:
                with open(f, "r", encoding="utf-8") as pf:
                    pdata = json.load(pf)
                    p_first = pdata.get("first")
                    p_records = pdata.get("records", [])
                    if p_first is not None:
                        existing_pages[p_first] = p_records
            except Exception:
                pass

    total_downloaded_records = []
    for first_idx in sorted(existing_pages.keys()):
        total_downloaded_records.extend(existing_pages[first_idx])

    if existing_pages:
        print(f"📂 Checkpoint bulundu: {len(existing_pages)} sayfa önceden indirilmiş ({len(total_downloaded_records)} kayıt).")
        for p_first, p_recs in existing_pages.items():
            if 0 < len(p_recs) < args.rows:
                print("🏁 Zaten son sayfa daha önceden indirilmiş. Tüm veriler eksiksiz!")
                save_merged_outputs(total_downloaded_records, args.output, args.output_csv)
                print("\n" + "=" * 70)
                print("🎉 İŞLEM BAŞARIYLA TAMAMLANDI!")
                print(f"   Toplam Kayıt: {len(total_downloaded_records)}")
                print(f"   JSON        : {os.path.abspath(args.output)}")
                print(f"   CSV         : {os.path.abspath(args.output_csv)}")
                print("=" * 70 + "\n")
                return

    # Oturum hazırlığı
    session = requests.Session() if requests is not None else StandardHttpSession()
    first = 0
    page_num = 1
    total_pages_est = (TOTAL_ESTIMATED + args.rows - 1) // args.rows

    print("\n" + "=" * 70)
    print(f"🚀 EPDK Şarj İstasyonları İndirme Başlatılıyor")
    print(f"   Sayfa Başı Kayıt : {args.rows}")
    print(f"   Tahmini Toplam   : ~{TOTAL_ESTIMATED} kayıt (~{total_pages_est} sayfa)")
    print(f"   İstek Gecikmesi  : {args.delay} saniye (anti-DDOS)")
    print(f"   Çıktı Dosyaları  : {args.output} ve {args.output_csv}")
    print("=" * 70 + "\n")

    consecutive_empty = 0

    while True:
        if first in existing_pages:
            p_len = len(existing_pages[first])
            print(f"⏩ [Sayfa {page_num}/{total_pages_est}] first={first}: Daha önce indirilmiş ({p_len} kayıt), atlanıyor.")
            if 0 < p_len < args.rows:
                print(f"🏁 Son sayfa ({p_len} < {args.rows} kayıt) tamamlanmış. İndirme bitti!")
                break
            first += args.rows
            page_num += 1
            continue

        print(f"📡 [Sayfa {page_num}/{total_pages_est}] İstek yapılıyor: first={first}, rows={args.rows}...")

        headers = {
            "User-Agent": user_agent,
            "Accept": "application/xml, text/xml, */*; q=0.01",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": url,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Faces-Request": "partial/ajax",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://lisans.epdk.gov.tr",
            "Connection": "keep-alive",
            "Cookie": cookie,
        }

        payload = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList",
            "javax.faces.partial.execute": "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList",
            "javax.faces.partial.render": "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList",
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList": "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList",
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList_pagination": "true",
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList_first": str(first),
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList_rows": str(args.rows),
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList_skipChildren": "true",
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList_encodeFeature": "true",
            "sarjIstasyonuOzetSorguSonucu": "sarjIstasyonuOzetSorguSonucu",
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList_rppDD": str(args.rows),
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList_selection": "",
            "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList_columnOrder": (
                "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList:j_idt64,"
                "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList:j_idt67,"
                "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList:j_idt70,"
                "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList:j_idt73,"
                "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList:j_idt76,"
                "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList:j_idt79,"
                "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList:j_idt82,"
                "sarjIstasyonuOzetSorguSonucu:sarjIstasyonuList:j_idt86"
            ),
            "javax.faces.ViewState": view_state,
        }

        success = False
        is_finished = False
        retry_count = 0
        while not success and retry_count < 3:
            try:
                resp = session.post(url, headers=headers, data=payload, timeout=45)

                if resp.status_code != 200:
                    print(f"⚠️ HTTP {resp.status_code} hatası! Yeniden deneniyor ({retry_count + 1}/3)...")
                    time.sleep(5)
                    retry_count += 1
                    continue

                records, new_vs, status = parse_table_xml(resp.text)

                if status == "SESSION_EXPIRED":
                    print("\n❌ Oturum süresi dolmuş veya geçersiz!")
                    cred = prompt_for_fresh_credentials(args.curl_file)
                    cookie = cred.get("cookie", cookie)
                    view_state = cred.get("view_state", view_state)
                    headers["Cookie"] = cookie
                    payload["javax.faces.ViewState"] = view_state
                    continue

                if new_vs:
                    view_state = new_vs

                if status != "OK" or records is None:
                    print(f"⚠️ Yanıt çözümlenemedi (durum: {status}). Yeniden deneniyor...")
                    time.sleep(5)
                    retry_count += 1
                    continue

                success = True
                print(f"✅ [Sayfa {page_num}] {len(records)} kayıt çekildi.")

                page_file = checkpoint_path / f"page_{page_num:03d}_first_{first}.json"
                with open(page_file, "w", encoding="utf-8") as pf:
                    json.dump(
                        {
                            "page": page_num,
                            "first": first,
                            "rows": args.rows,
                            "count": len(records),
                            "timestamp": datetime.now().isoformat(),
                            "records": records,
                        },
                        pf,
                        ensure_ascii=False,
                        indent=2,
                    )

                existing_pages[first] = records
                total_downloaded_records.extend(records)

                save_merged_outputs(total_downloaded_records, args.output, args.output_csv)
                print(f"   📊 Toplam biriken kayıt: {len(total_downloaded_records)}")

                if len(records) == 0:
                    consecutive_empty += 1
                    if consecutive_empty >= 1:
                        print("🏁 Boş sayfa alındı, tüm sayfaların indirilmesi tamamlandı.")
                        is_finished = True
                        break
                else:
                    consecutive_empty = 0

                if len(records) < args.rows:
                    print(f"🏁 Son sayfa tespit edildi ({len(records)} < {args.rows}). İndirme tamamlandı!")
                    is_finished = True
                    break

            except RequestException as e:
                print(f"⚠️ Bağlantı hatası: {e}. 10 sn sonra yeniden denenecek ({retry_count + 1}/3)...")
                time.sleep(10)
                retry_count += 1
            except Exception as e:
                print(f"⚠️ Beklenmeyen hata: {e}. 10 sn sonra yeniden denenecek ({retry_count + 1}/3)...")
                time.sleep(10)
                retry_count += 1

        if is_finished:
            break

        if not success:
            print(f"❌ Sayfa {page_num} (first={first}) 3 denemeden sonra çekilemedi.")
            cred = prompt_for_fresh_credentials(args.curl_file)
            cookie = cred.get("cookie", cookie)
            view_state = cred.get("view_state", view_state)
            continue

        first += args.rows
        page_num += 1

        if args.delay > 0:
            wait_with_countdown(args.delay)

    save_merged_outputs(total_downloaded_records, args.output, args.output_csv)

    print("\n" + "=" * 70)
    print("🎉 İŞLEM BAŞARIYLA TAMAMLANDI!")
    print(f"   Toplam Çekilen Kayıt: {len(total_downloaded_records)}")
    print(f"   JSON Dosyası        : {os.path.abspath(args.output)}")
    print(f"   CSV Dosyası         : {os.path.abspath(args.output_csv)}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ İşlem kullanıcı tarafından durduruldu (Ctrl+C).")
        print("💡 Not: İndirilen sayfalar 'epdk_checkpoints' klasörüne kaydedildi.")
        print("Komutu tekrar çalıştırdığınızda otomatik olarak kaldığı yerden devam edecektir!")
        sys.exit(0)
