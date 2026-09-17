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
if $PYTHON_BIN scripts/import_cpo_stations.py >> "$LOG_FILE" 2>&1; then
    log "ETL Pipeline başarıyla tamamlandı."
else
    log "UYARI: ETL Pipeline çalışırken bir sorun oluştu! Log dosyasını inceleyiniz."
fi

# 3. Güncellenen Verinin Boyut ve Durum Kontrolü
OUTPUT_JSON="$ROOT_DIR/workspace/src/backend/src/data/cpo_stations.json"
if [ -f "$OUTPUT_JSON" ]; then
    STATION_COUNT=$($PYTHON_BIN -c "import json; data=json.load(open('$OUTPUT_JSON')); print(len(data))" 2>/dev/null || echo "Bilinmiyor")
    FILE_SIZE=$(ls -lh "$OUTPUT_JSON" | awk '{print $5}')
    log "Güncel İstasyon Veri Havuzu: $OUTPUT_JSON"
    log "Toplam Aktif İstasyon Sayısı: $STATION_COUNT (Dosya Boyutu: $FILE_SIZE)"
else
    log "UYARI: Çıktı dosyası ($OUTPUT_JSON) bulunamadı!"
fi

# 4. API Servisini Yeniden Başlat (Bellek-içi önbelleği tazelemesi için)
mkdir -p "$ROOT_DIR/tmp"
touch "$ROOT_DIR/tmp/restart.txt"
log "cPanel Passenger yeniden başlatma sinyali gönderildi (tmp/restart.txt)."

# 5. Log Dosyası Boyut Sınırlandırması (10.000 satırı aşarsa son 5.000 satırı tut)
if [ -f "$LOG_FILE" ]; then
    LINE_COUNT=$(wc -l < "$LOG_FILE")
    if [ "$LINE_COUNT" -gt 10000 ]; then
        tail -n 5000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
        log "Log dosyası rotasyonu yapıldı (son 5.000 satır saklandı)."
    fi
fi

log "Günlük İstasyon Senkronizasyonu Başarıyla Tamamlandı."
log "========================================================"
