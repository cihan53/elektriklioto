#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://apigateway.epdk.gov.tr/sarjIstasyonlari/"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "epdk_sarj_istasyonlari.json"

def get_stations():
    # EPDK API Gateway tüm alanları string olarak bekler.
    payload = {
        "lisansNo": "",
        "sarjIstasyonuNo": "",
        "markaAdi": "",
        "yesilSarjIstasyonuMu": "",
        "sarjIstasyonuAdi": "",
        "hizmetSekli": ""
    }

    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:156.0) Gecko/20100101 Firefox/156.0"
        },
        method="GET"
    )

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as response:
            raw_text = response.read().decode("utf-8", errors="replace")
            return json.loads(raw_text)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"[!] EPDK API Hatası (HTTP {e.code}): {err_body}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"[!] Bağlantı hatası: {e}", file=sys.stderr)
        raise

def main():
    print("EPDK Şarj İstasyonları API test ediliyor...")
    print(f"Hedef URL: {API_URL}")

    try:
        data = get_stations()
    except Exception:
        print("\n[i] NOT: EPDK apigateway uç noktası API anahtarı veya iç ağ yetkilendirmesi gerektirebilir.")
        print("[i] İstasyon verilerini almak için 'epdk_scraper.py' veya resmi sorgu portalındaki Excel export kullanılabilir.")
        return 1

    if isinstance(data, list):
        records = data
    elif isinstance(data, dict):
        records = data.get("istasyonlar", data.get("data", data))
    else:
        raise RuntimeError(f"Beklenmeyen API cevabı: {type(data).__name__}")

    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    if isinstance(records, list):
        print(f"✓ Başarılı: {len(records):,} kayıt kaydedildi.")
    else:
        print("✓ Başarılı: JSON yanıtı kaydedildi.")

    print(f"Dosya: {OUTPUT_FILE.resolve()}")
    return 0

if __name__ == "__main__":
    sys.exit(main())

