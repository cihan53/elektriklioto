#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Günlük Şarj İstasyonları Veri Senkronizasyonu (Cronjob)
# Sprint: S13 — Müşteri Denetimi & Saha Onarımları (TALEP-014)
# ==============================================================================
# Bu betik her gece cPanel Cron Jobs tarafından tetiklenir.
# ZES, Trugo, Voltrun, Eşarj ve EPDK veri kaynaklarını derleyip
# backend veri havuzunu günceller ve servisi sessizce yeniden başlatır.
# ==============================================================================

set -euo pipefail

# Betiğin bulunduğu dizinden proje kök dizinine geç
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/cron_daily_sync.log"

mkdir -p "$LOG_DIR"

# cPanel ve sistem PATH genişletmesi
export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/bin:$PATH"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================================"
log "Günlük İstasyon Senkronizasyonu Başlatıldı."
log "Proje Dizini: $ROOT_DIR"

# 1. Python 3 Yorumlayıcısının Tespiti (cPanel EA, Alt-Python, Virtualenv ve Sistem)
PYTHON_BIN=""
CANDIDATE_PYTHONS=(
    "$ROOT_DIR/.venv/bin/python3"
    "$ROOT_DIR/.venv/bin/python"
    "$ROOT_DIR/venv/bin/python3"
    "$ROOT_DIR/venv/bin/python"
    "$HOME/virtualenv/app/3.11/bin/python3"
    "$HOME/virtualenv/app/3.10/bin/python3"
    "$HOME/virtualenv/app/3.9/bin/python3"
    "/opt/alt/python311/bin/python3"
    "/opt/alt/python310/bin/python3"
    "/opt/alt/python39/bin/python3"
    "/opt/alt/python38/bin/python3"
    "/opt/cpanel/ea-python311/bin/python3"
    "/opt/cpanel/ea-python310/bin/python3"
    "/opt/cpanel/ea-python39/bin/python3"
    "/usr/local/bin/python3.11"
    "/usr/local/bin/python3.10"
    "/usr/local/bin/python3.9"
    "/usr/local/bin/python3"
    "$(which python3.11 2>/dev/null || true)"
    "$(which python3.10 2>/dev/null || true)"
    "$(which python3.9 2>/dev/null || true)"
    "/usr/bin/python3"
)

for py_cand in "${CANDIDATE_PYTHONS[@]}"; do
    if [ -x "$py_cand" ]; then
        PYTHON_BIN="$py_cand"
        break
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    if which python3 >/dev/null 2>&1; then
        PYTHON_BIN="$(which python3)"
    elif which python >/dev/null 2>&1; then
        PYTHON_BIN="$(which python)"
    fi
fi

if [ -z "$PYTHON_BIN" ]; then
    log "HATA: Python 3 yorumlayıcısı bulunamadı!"
    exit 1
fi

log "Kullanılan Python: $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"

# 1.5 Node.js Yorumlayıcısının Tespiti (EPDK Puppeteer scraper için)
NODE_BIN=""
for n_cand in \
    "$ROOT_DIR/server-scripts/epdk/node_modules/.bin/node" \
    $HOME/nodevenv/*/*/bin/node \
    /opt/alt/nodejs*/bin/node \
    /opt/alt/alt-nodejs*/root/usr/bin/node \
    /usr/local/bin/node \
    /usr/bin/node \
    "$(which node 2>/dev/null || true)"; do
    if [ -n "$n_cand" ] && [ -x "$n_cand" ]; then
        NODE_BIN="$n_cand"
        break
    fi
done

# 2. EPDK Veri İndirme: Önce resmi API Gateway (epdk_api_fetch.py), başarısızsa
#    Puppeteer scraper (scrape.mjs). İkisi de epdk_output/ altına birleşik JSON yazar.
#    İkisi de başarısız olursa ETL mevcut checkpoint/önbellek ile devam eder.
cd "$ROOT_DIR"
log "EPDK API Gateway deneniyor (epdk_api_fetch.py)..."
if "$PYTHON_BIN" server-scripts/epdk_api_fetch.py >> "$LOG_FILE" 2>&1; then
    log "EPDK verisi API Gateway'den alındı; Puppeteer scraper atlandı."
elif [ -n "$NODE_BIN" ] && [ -f "$ROOT_DIR/server-scripts/epdk/scrape.mjs" ]; then
    log "API başarısız → EPDK Scraper (server-scripts/epdk/scrape.mjs) çalıştırılıyor..."
    log "Kullanılan Node: $NODE_BIN ($("$NODE_BIN" --version 2>&1))"
    if ! "$NODE_BIN" "$ROOT_DIR/server-scripts/epdk/scrape.mjs" >> "$LOG_FILE" 2>&1; then
        log "UYARI: EPDK scraper tamamlanamadı (Chrome/captcha eksik olabilir). ETL mevcut checkpoint'lerle devam edecek."
    fi
else
    log "API başarısız ve Node.js bulunamadı; ETL mevcut veriyle devam edecek."
fi

# 3. CPO Veri Senkronizasyon Betiğini Çalıştır
log "ETL Pipeline (import_cpo_stations.py) çalıştırılıyor..."
if ! "$PYTHON_BIN" server-scripts/import_cpo_stations.py >> "$LOG_FILE" 2>&1; then
    log "UYARI: ETL Pipeline çalışırken bir sorun oluştu veya istasyon bulunamadı! Log dosyasını inceleyiniz."
fi

# 4. Güncellenen Verinin Boyut ve Durum Kontrolü (TALEP-014 Güvenlik Doğrulaması)
DATA_FILE="$ROOT_DIR/workspace/src/backend/src/data/cpo_stations.json"
BAK_FILE="$ROOT_DIR/workspace/src/backend/src/data/cpo_stations.json.bak"

STATION_COUNT=0
if [ -f "$DATA_FILE" ]; then
    STATION_COUNT=$("$PYTHON_BIN" -c "import json; data=json.load(open('$DATA_FILE', encoding='utf-8')); print(len(data))" 2>/dev/null || echo "0")
fi

if [ "$STATION_COUNT" -gt 0 ]; then
    FILE_SIZE=$(du -h "$DATA_FILE" 2>/dev/null | cut -f1 || echo "Bilinmiyor")
    log "ETL Pipeline başarıyla tamamlandı."
    log "Güncel İstasyon Dosyası: $FILE_SIZE ($STATION_COUNT istasyon hazır)"
else
    log "UYARI: Güncel veri dosyasında 0 istasyon tespit edildi!"
    if [ -f "$BAK_FILE" ]; then
        log "Güvenlik kalkanı: Mevcut yedek (cpo_stations.json.bak) geri yükleniyor..."
        cp "$BAK_FILE" "$DATA_FILE"
        STATION_COUNT=$("$PYTHON_BIN" -c "import json; data=json.load(open('$DATA_FILE', encoding='utf-8')); print(len(data))" 2>/dev/null || echo "0")
        FILE_SIZE=$(du -h "$DATA_FILE" 2>/dev/null | cut -f1 || echo "Bilinmiyor")
        log "Yedekten Geri Yüklendi: $FILE_SIZE ($STATION_COUNT istasyon hazır)"
    else
        log "HATA: Yedek dosya da bulunamadı! Lütfen logları ve veri kaynaklarını kontrol ediniz."
    fi
fi

# 5. PostgreSQL Senkronizasyonu: cpo_stations.json -> station/connector tabloları.
#    seed_postgres.py upsert SQL'i üretir (ON CONFLICT istasyon_no DO UPDATE) ve
#    DATABASE_URL varsa psql ile uygular. .env'den okunur, cron env'iyle de geçilebilir.
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT_DIR/.env" ]; then
    DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$ROOT_DIR/.env" | head -1 | tr -d '"' | tr -d "'")"
    export DATABASE_URL
fi
if [ "$STATION_COUNT" -gt 0 ] && [ -n "${DATABASE_URL:-}" ]; then
    log "PostgreSQL senkronizasyonu (seed_postgres.py) çalıştırılıyor..."
    if ! "$PYTHON_BIN" server-scripts/seed_postgres.py >> "$LOG_FILE" 2>&1; then
        log "UYARI: PostgreSQL senkronizasyonu başarısız. server-scripts/seed_data.sql elle uygulanabilir."
    fi
elif [ "$STATION_COUNT" -gt 0 ]; then
    log "DATABASE_URL tanımlı değil; PostgreSQL senkronizasyonu atlandı (sadece JSON güncellendi)."
fi

# 6. cPanel Passenger Yeniden Başlatma (Zero-downtime reload)
TMP_DIR="$ROOT_DIR/tmp"
mkdir -p "$TMP_DIR"
touch "$TMP_DIR/restart.txt"

# Frontend SSR için de restart bayrağı bırak (varsa)
if [ -d "$ROOT_DIR/workspace/src/frontend/tmp" ]; then
    touch "$ROOT_DIR/workspace/src/frontend/tmp/restart.txt"
fi

log "cPanel Passenger uygulaması yeniden başlatıldı (restart.txt)."

# 7. Log Temizliği (Log dosyası 5 MB'ı geçerse son 1000 satırı tut)
if [ -f "$LOG_FILE" ]; then
    FILE_BYTES=$(wc -c < "$LOG_FILE")
    if [ "$FILE_BYTES" -gt 5242880 ]; then
        tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
        log "Log dosyası rotasyona tabi tutuldu (5 MB sınırı aşıldı)."
    fi
fi

log "Günlük Senkronizasyon İşlemi Tamamlandı."
log "========================================================"
