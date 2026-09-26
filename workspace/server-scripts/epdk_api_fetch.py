#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPDK Şarj İstasyonları API Gateway — Tam Liste İndirici
------------------------------------------------------
https://apigateway.epdk.gov.tr/sarjIstasyonlari/ uç noktasına filtresiz tek bir
GET+JSON isteği atar; dönen TÜM istasyon kayıtlarını ETL'nin kullandığı EPDK kayıt
formatına (istasyon_no, marka, adres, ...) normalize edip
epdk_output/apigateway_istasyonlari_<timestamp>.json dosyasına yazar.

Kota notu (EPDK): filtresiz istek saatte 1, filtreli istek dakikada 1 ile sınırlıdır.
Bu betik bu yüzden TEK bir filtresiz istek atar ve sonucu diske kalıcı yazar;
başarısızlık durumunda cron tarafı Puppeteer scraper'a düşer.

Çıkış kodu: 0 = veri indi ve yazıldı, 1 = kota/http/boş veri (scraper devreye girer).

Kullanım:
  python3 server-scripts/epdk_api_fetch.py
"""

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

API_URL = "https://apigateway.epdk.gov.tr/sarjIstasyonlari/"
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "epdk_output"
TIMEOUT = int(os.environ.get("EPDK_API_TIMEOUT", "180"))


def call_api(timeout=TIMEOUT):
    """Dönüş: (http_status, json_body | None, raw_text). GET + JSON gövde (EPDK şeması)."""
    req = urllib.request.Request(
        API_URL,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "elektriklioto-sync/1.0",
        },
        method="GET",
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            status, text = resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode("utf-8", errors="replace")
    except Exception as e:
        return 0, None, str(e)
    try:
        return status, json.loads(text), text
    except ValueError:
        return status, None, text


def classify(status, data, raw):
    """Yanıtı sınıflandır: OK / QUOTA / THROTTLED / FAULT / EMPTY / HTTP_x"""
    if isinstance(data, dict):
        fault = data.get("fault")
        if fault:
            msg = fault.get("faultString", "")
            if "QUOTA" in msg:
                return "QUOTA", msg
            if "Throttling" in msg:
                return "THROTTLED", msg
            return "FAULT", msg
        if status == 200:
            rows = data.get("data")
            if isinstance(rows, list) and rows:
                return "OK", ""
            return "EMPTY", ""
        return "HTTP_%d" % status, (raw or "")[:300]
    return "HTTP_%d" % status, (raw or "")[:300]


def soket_ozeti(soketler):
    """soketler dizisini okunabilir 'soket_bilgileri' metnine çevirir."""
    if not isinstance(soketler, list):
        return ""
    parts = []
    for s in soketler:
        if not isinstance(s, dict):
            continue
        tip = (s.get("soketTipi") or "").strip()
        tur = (s.get("soketTuru") or "").strip()
        guc = (s.get("soketGucu") or "").strip()
        p = " ".join([x for x in (tip, tur) if x])
        if guc:
            p = "{} {}kW".format(p, guc) if p else "{}kW".format(guc)
        if p:
            parts.append(p)
    return ", ".join(parts)


def normalize(item):
    """API kaydını ETL'nin EPDK kayıt şekline çevirir (checkpoint formatıyla aynı alanlar + koordinat)."""
    if not isinstance(item, dict):
        return None
    rec = {
        "istasyon_no": str(item.get("sarjIstasyonuNo") or "").strip(),
        "istasyon_adi": str(item.get("sarjIstasyonuAdi") or "").strip(),
        "hizmet_sekli": str(item.get("hizmetSekli") or "").strip(),
        "marka": str(item.get("marka") or "").strip(),
        "sarj_agi_isletmecisi": str(item.get("sarjAgiIsletmecisiUnvan") or "").strip(),
        "sarj_istasyonu_isletmecisi": str(item.get("sarjIstasyonuIsletmecisi") or "").strip(),
        "adres": str(item.get("adres") or "").strip(),
        "soket_bilgileri": soket_ozeti(item.get("soketler")),
        "enlem": item.get("enlem"),
        "boylam": item.get("boylam"),
        "yesil_sarj": str(item.get("yesilSarjIstasyonuMu") or "").strip(),
        "soketler": item.get("soketler"),
    }
    return rec if rec["istasyon_no"] or rec["istasyon_adi"] else None


def main():
    print("📡 EPDK API Gateway sorgulanıyor (filtresiz, saatte 1 kota): {}".format(API_URL))
    status, data, raw = call_api()
    kind, msg = classify(status, data, raw)

    if kind != "OK":
        print("❌ API yanıtı: {} (HTTP {}) {}".format(kind, status, msg))
        return 1

    rows = data.get("data") or []
    records = [r for r in (normalize(it) for it in rows) if r]
    koordinatli = sum(1 for r in records if r.get("enlem") and r.get("boylam"))
    print("✅ numRows={}, dönen={}, koordinatlı={}".format(data.get("numRows"), len(records), koordinatli))

    # Sıfır-kayıt kalkanı: boş sonucu asla diske yazma
    if not records:
        print("❌ API boş kayıt döndürdü; dosya yazılmadı.")
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%dT%H%M%S")
    tmp = OUT_DIR / ("apigateway_istasyonlari_{}.json.tmp".format(ts))
    out = OUT_DIR / ("apigateway_istasyonlari_{}.json".format(ts))
    with open(str(tmp), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    if not tmp.exists() or tmp.stat().st_size < 100:
        print("❌ Geçici dosya yazılamadı.")
        return 1
    os.replace(str(tmp), str(out))
    print("📄 Yazıldı: {} ({} kayıt)".format(out, len(records)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
