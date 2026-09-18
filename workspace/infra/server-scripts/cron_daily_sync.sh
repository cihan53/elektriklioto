
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Günlük Şarj İstasyonları Veri Senkronizasyonu (Cronjob)
# Sprint: S13 — TALEP-014 Sıfır İstasyon Hatası Onarımı & Kurtarma Kalkanı
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

# 1. Python 3 Yorumlayıcısının Tespiti (Öncelikli Modern Python ve Virtualenv Desteği)
PYTHON_BIN=""
CANDIDATE_PYTHONS=(
    "$ROOT_DIR/.venv/bin/python3"
    "$ROOT_DIR/venv/bin/python3"
    "$HOME/virtualenv/app/3.11/bin/python3"
    "$HOME/virtualenv/app/3.10/bin/python3"
    "$HOME/virtualenv/app/3.9/bin/python3"
    "/opt/cpanel/ea-python311/root/usr/bin/python3"
    "/opt/cpanel/ea-python310/root/usr/bin/python3"
    "/opt/alt/python311/bin/python3"
    "/opt/alt/python310/bin/python3"
    "/opt/alt/python39/bin/python3"
    "/usr/local/bin/python3.11"
    "/usr/local/bin/python3.10"
    "/usr/local/bin/python3"
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

# 2. CPO Veri Senkronizasyon Betiğini Çalıştır
cd "$ROOT_DIR"

log "ETL Pipeline (import_cpo_stations.py) çalıştırılıyor..."
if ! "$PYTHON_BIN" server-scripts/import_cpo_stations.py >> "$LOG_FILE" 2>&1; then
    log "UYARI: ETL Pipeline çalışırken bir sorun oluştu veya istasyon bulunamadı! Log dosyasını inceleyiniz."
fi

# 3. Güncellenen Verinin Boyut ve Durum Kontrolü (TALEP-014 Güvenlik Doğrulaması)
DATA_FILE="$ROOT_DIR/workspace/src/backend/src/data/cpo_stations.json"
BAK_FILE="$ROOT_DIR/workspace/src/backend/src/data/cpo_stations.json.bak"
SEED_FILE="$ROOT_DIR/server-scripts/data/cpo_stations.json"

STATION_COUNT=0
if [ -f "$DATA_FILE" ]; then
    STATION_COUNT=$("$PYTHON_BIN" -c "import json; data=json.load(open('$DATA_FILE', encoding='utf-8')); print(len(data))" 2>/dev/null || echo "0")
fi

# Sıfır İstasyon Kalkanı: Eğer 0 kayıt tespit edilirse veya dosya yoksa kurtarma mekanizması devreye girer
if [ "$STATION_COUNT" = "0" ] || [ "$STATION_COUNT" = "Bilinmiyor" ] || [ ! -f "$DATA_FILE" ]; then
    log "UYARI: cpo_stations.json içinde 0 istasyon tespit edildi! Kurtarma mekanizması çalıştırılıyor..."
    mkdir -p "$(dirname "$DATA_FILE")"
    if [ -f "$BAK_FILE" ] && [ $(wc -c < "$BAK_FILE") -gt 1000 ]; then
        cp -f "$BAK_FILE" "$DATA_FILE"
        log "Kurtarma: cpo_stations.json.bak yedeğinden geri yüklendi."
    elif [ -f "$SEED_FILE" ] && [ $(wc -c < "$SEED_FILE") -gt 1000 ]; then
        cp -f "$SEED_FILE" "$DATA_FILE"
        log "Kurtarma: server-scripts/data/cpo_stations.json tohum dosyasından geri yüklendi."
    fi
    STATION_COUNT=$("$PYTHON_BIN" -c "import json; data=json.load(open('$DATA_FILE', encoding='utf-8')); print(len(data))" 2>/dev/null || echo "0")
fi

if [ -f "$DATA_FILE" ] && [ "$STATION_COUNT" -gt 0 ]; then
    FILE_SIZE=$(du -h "$DATA_FILE" 2>/dev/null | cut -f1 || echo "Bilinmiyor")
    log "ETL Pipeline başarıyla tamamlandı."
    log "Güncel İstasyon Dosyası: $FILE_SIZE ($STATION_COUNT istasyon hazır)"
else
    log "HATA: cpo_stations.json dosyası hiçbir kaynaktan temin edilemedi!"
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
