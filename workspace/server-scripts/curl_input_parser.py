#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multi-source cURL Parser & Executor for CPO and EPDK Data Pipeline (TALEP-017).
Supports 'kaynak: curl ...' format and legacy single cURL format.
Zero external pip dependencies (uses standard urllib, ssl, json, re, shlex).
"""

import sys
import os
import re
import ssl
import json
import shlex
import urllib.request
import urllib.parse
import gzip
import zlib
from pathlib import Path

def split_curl_sources(file_content: str) -> dict:
    """
    curl_input.txt dosyasını kaynak bazlı ayrıştırır.
    Desteklenen format:
      epdk: curl 'https://...'
      voltrun: curl 'https://...'
      zes: curl 'https://...'
    Eğer kaynak öneki yoksa geriye dönük uyumluluk için 'epdk' kabul edilir.
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

        # Satır başı kaynak tespiti: 'kaynak: curl ...' veya 'kaynak:'
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
                # Henüz kaynak belirtilmemişse geriye dönük uyumluluk için epdk
                current_source = "epdk"
                current_lines.append(line)

    if current_source and current_lines:
        sources[current_source] = "\n".join(current_lines).strip()

    return sources

def parse_curl_command(curl_text: str) -> dict:
    """
    Tek bir cURL komut metnini URL, HTTP methodu, başlıklar, body ve form parametrelerine ayrıştırır.
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

    # Satır sonu ters slaşları (\) temizle
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

    # Form gövdesinden parametreleri ve EPDK ViewState'i çıkart
    if info["body"]:
        try:
            params = urllib.parse.parse_qs(info["body"])
            info["data_params"] = {k: v[0] for k, v in params.items() if v}
            if "javax.faces.ViewState" in params and params["javax.faces.ViewState"]:
                info["view_state"] = params["javax.faces.ViewState"][0]
        except Exception:
            pass

    return info

def execute_curl(parsed_curl: dict, timeout: int = 15) -> tuple:
    """
    Ayrıştırılmış cURL komutunu urllib ile çalıştırır.
    Dönüş: (data, error_message)
    data: JSON (dict/list) veya düz metin
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

    # Standart urllib sıkıştırma başlığı optimizasyonu
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
        return None, f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return None, f"Ağ Hatası: {e.reason}"
    except Exception as e:
        return None, f"İstek Hatası: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        fpath = sys.argv[1]
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            sources = split_curl_sources(content)
            print(f"Tespit edilen kaynaklar ({len(sources)}): {list(sources.keys())}")
            for name, cmd in sources.items():
                parsed = parse_curl_command(cmd)
                print(f" - [{name}] URL: {parsed['url']} | Metot: {parsed['method']} | Header: {len(parsed['headers'])}")
