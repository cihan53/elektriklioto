#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPDK Şarj İstasyonları API — Kontrollü Parametre Testi
-----------------------------------------------------
https://apigateway.epdk.gov.tr/sarjIstasyonlari/ (Swagger: ?swagger)
  - Yalnızca GET + JSON gövde kabul eder (POST 404, gövdesiz GET 400).
  - Tüm alanlar string olmalı (null şema hatası verir).
  - Birkaç istekte QUOTA / Throttling limitine takılır; bu yüzden sorgular
    arasında uzun bekleme vardır ve kota hatasında test durur.

Sonuçlar epdk_api_probe.json dosyasına yazılır; mevcut EPDK veri dosyalarına dokunulmaz.

Kullanım:
  python3 server-scripts/epdk_api_probe.py                      # varsayılan 3 sorgu, 60 sn ara
  python3 server-scripts/epdk_api_probe.py --delay 120
  python3 server-scripts/epdk_api_probe.py --query '{"markaAdi": "Trugo"}'
"""

import argparse
import json
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

API_URL = "https://apigateway.epdk.gov.tr/sarjIstasyonlari/"
FIELDS = ["lisansNo", "sarjIstasyonuNo", "markaAdi", "yesilSarjIstasyonuMu", "sarjIstasyonuAdi", "hizmetSekli"]
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "epdk_api_probe.json"

DEFAULT_QUERIES = [
    ("Tam eşleşme: istasyon no", {"sarjIstasyonuNo": "ŞRJ/9055"}),
    ("Marka bazlı liste", {"markaAdi": "ZES"}),
    ("Hizmet şekli (geniş liste)", {"hizmetSekli": "Halka Açık"}),
]


def call_api(filters, timeout=120):
    """Dönüş: (http_status, json_body | None, raw_text)"""
    body = {f: "" for f in FIELDS}
    body.update(filters)
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="GET",
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            status, text = resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode("utf-8", errors="replace")
    try:
        return status, json.loads(text), text
    except ValueError:
        return status, None, text


def classify(status, data):
    fault = (data or {}).get("fault") if isinstance(data, dict) else None
    if fault:
        msg = fault.get("faultString", "")
        if "QUOTA" in msg:
            return "QUOTA", msg
        if "Throttling" in msg:
            return "THROTTLED", msg
        return "FAULT", msg
    if status == 200 and isinstance(data, dict):
        return "OK", ""
    return "HTTP_%d" % status, ""


def summarize(data):
    result = data.get("result")
    rows = result if isinstance(result, list) else []
    summary = {"numRows": data.get("numRows"), "donen_kayit": len(rows),
               "elapsedTime": data.get("elapsedTime"), "errors": data.get("errors")}
    if rows:
        summary["koordinatli"] = sum(1 for r in rows if isinstance(r, dict) and r.get("enlem") and r.get("boylam"))
        summary["ornek"] = rows[0]
    return summary, rows


def main():
    ap = argparse.ArgumentParser(description="EPDK şarj istasyonları API parametre testi")
    ap.add_argument("--delay", type=int, default=60, help="Sorgular arası bekleme, sn (varsayılan 60)")
    ap.add_argument("--query", action="append", default=[],
                    help='Özel sorgu (JSON), örn. \'{"markaAdi": "Trugo"}\'. Birden fazla verilebilir.')
    args = ap.parse_args()

    queries = [("Özel sorgu", json.loads(q)) for q in args.query] if args.query else DEFAULT_QUERIES
    report = {"tarih": datetime.now().isoformat(), "api": API_URL, "sonuclar": []}

    for i, (label, filters) in enumerate(queries):
        if i > 0:
            print("   ⏳ {} sn bekleniyor...".format(args.delay))
            time.sleep(args.delay)

        print("📡 [{}/{}] {}: {}".format(i + 1, len(queries), label, json.dumps(filters, ensure_ascii=False)))
        status, data, raw = call_api(filters)
        kind, msg = classify(status, data)

        if kind == "THROTTLED":
            wait = args.delay * 3
            print("   ⚠️ Throttling limiti. {} sn bekleyip bir kez tekrar deneniyor...".format(wait))
            time.sleep(wait)
            status, data, raw = call_api(filters)
            kind, msg = classify(status, data)

        entry = {"etiket": label, "filtre": filters, "http": status, "durum": kind}
        if kind == "OK":
            summary, rows = summarize(data)
            entry.update(summary)
            entry["columnNames"] = data.get("columnNames")
            entry["kayitlar"] = rows
            print("   ✅ numRows={}, dönen={}, koordinatlı={}".format(
                summary["numRows"], summary["donen_kayit"], summary.get("koordinatli", 0)))
            if summary.get("ornek"):
                print("   örnek: {}".format(json.dumps(summary["ornek"], ensure_ascii=False)[:300]))
        else:
            entry["mesaj"] = msg or raw[:500]
            print("   ❌ {} (HTTP {}): {}".format(kind, status, entry["mesaj"]))
        report["sonuclar"].append(entry)

        with open(str(OUTPUT_FILE), "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        if kind == "QUOTA":
            print("\n🛑 Kota dolu — kalan sorgular atlanıyor. Daha sonra tekrar deneyin.")
            break

    print("\n📄 Rapor: {}".format(OUTPUT_FILE))
    return 0 if all(r["durum"] == "OK" for r in report["sonuclar"]) else 1


if __name__ == "__main__":
    sys.exit(main())
