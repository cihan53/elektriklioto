#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Günlük Şarj İstasyonları Veri Senkronizasyonu (Cronjob)
# ==============================================================================
# Bu betik her gece cPanel Cron Jobs tarafından tetiklenir.
# ZES, Trugo, Voltrun, Eşarj ve EPDK veri kaynaklarını derleyip
# backend veri havuzunu günceller ve servisi sessizce yeniden başlatır.
# ==============================================================================

set -e

# Betiğin bulunduğu dizinden proje kök dizinine geç
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/cron_daily_sync.log"

mkdir -p "$LOG_DIR"

# cPanel PATH genişletmesi (Python3 ve Node yolları)
export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/bin:$PATH"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================================"
log "Günlük İstasyon Senkronizasyonu Başlatıldı."
log "Proje Dizini: $ROOT_DIR"

# 1. Python 3 Yorumlayıcısının Tespiti
PYTHON_BIN=""
if which python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(which python3)"
elif [ -f /usr/bin/python3 ]; then
    PYTHON_BIN="/usr/bin/python3"
elif [ -f /usr/local/bin/python3 ]; then
    PYTHON_BIN="/usr/local/bin/python3"
elif which python >/dev/null 2>&1; then
    PYTHON_BIN="$(which python)"
fi

if [ -z "$PYTHON_BIN" ]; then
    log "HATA: Python 3 yorumlayıcısı bulunamadı!"
    exit 1
fi

log "Kullanılan Python: $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"

# 2. CPO Veri Senkronizasyon Betiğini Çalıştır
cd "$ROOT_DIR"

log "ETL Pipeline (import_cpo_stations.py) çalıştırılıyor..."
if $PYTHON_BIN server-scripts/import_cpo_stations.py >> "$LOG_FILE" 2>&1; then
    log "ETL Pipeline başarıyla tamamlandı."
else
    log "UYARI: ETL Pipeline çalışırken bir sorun oluştu! Log dosyasını inceleyiniz."
fi

# 3. Güncellenen Verinin Boyut ve Durum Kontrolü
DATA_FILE="$ROOT_DIR/workspace/src/backend/src/data/cpo_stations.json"
if [ -f "$DATA_FILE" ]; then
    FILE_SIZE=$(du -h "$DATA_FILE" | cut -f1)
    STATION_COUNT=$($PYTHON_BIN -c "import json; data=json.load(open('$DATA_FILE')); print(len(data))" 2>/dev/null || echo "Bilinmiyor")
    log "Güncel İstasyon Dosyası: $FILE_SIZE ($STATION_COUNT istasyon hazır)"
else
    log "UYARI: cpo_stations.json dosyası bulunamadı!"
fi

# 4. cPanel Passenger Yeniden Başlatma (Zero-downtime reload)
TMP_DIR="$ROOT_DIR/tmp"
mkdir -p "$TMP_DIR"
touch "$TMP_DIR/restart.txt"

# Frontend SSR için de restart bayrağı bırak (varsa)
if [ -d "$ROOT_DIR/workspace/src/frontend/tmp" ]; then
    touch "$ROOT_DIR/workspace/src/frontend/tmp/restart.txt"
fi

log "cPanel Passenger uygulaması yeniden başlatıldı (restart.txt)."

# 5. Log Temizliği (Log dosyası 5 MB'ı geçerse son 1000 satırı tut)
if [ -f "$LOG_FILE" ]; then
    FILE_BYTES=$(wc -c < "$LOG_FILE")
    if [ "$FILE_BYTES" -gt 5242880 ]; then
        tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
        log "Log dosyası rotasyona tabi tutuldu (5 MB sınırı aşıldı)."
    fi
fi

log "Günlük Senkronizasyon İşlemi Tamamlandı."
log "========================================================"
