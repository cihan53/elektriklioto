#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Backend Fastify API Başlatıcı & İzleyici (Watchdog)
# ==============================================================================
# Bu betik backend Fastify API'sini arka planda (Port 4000) başlatır,
# varsa eski süreçleri temizler ve sağlık kontrolü (health check) yapar.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$ROOT_DIR/tmp/backend.pid"
LOG_FILE="$ROOT_DIR/logs/backend.log"

mkdir -p "$ROOT_DIR/tmp" "$ROOT_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================================"
log "Backend API Başlatma Süreci Başlatıldı..."
log "Proje Dizini: $ROOT_DIR"

# 1. Node.js Binary Tespiti
NODE_BIN=""
CANDIDATES=(
    "$HOME/nodevenv/app/20/bin/node"
    "$HOME/nodevenv/app/18/bin/node"
    "/opt/alt/alt-nodejs20/root/usr/bin/node"
    "/opt/alt/alt-nodejs18/root/usr/bin/node"
    "/usr/local/bin/node"
    "/usr/bin/node"
    "$(which node 2>/dev/null || true)"
)

for cand in "${CANDIDATES[@]}"; do
    if [ -n "$cand" ] && [ -x "$cand" ]; then
        NODE_BIN="$cand"
        break
    fi
done

if [ -z "$NODE_BIN" ]; then
    log "HATA: Sistemde çalıştırılabilir Node.js bulunamadı!"
    exit 1
fi

log "Kullanılan Node: $NODE_BIN ($($NODE_BIN -v 2>&1))"

# 2. Port 4000 ve Eski Süreçleri Temizle
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        log "Mevcut backend süreci sonlandırılıyor (PID: $OLD_PID)..."
        kill -15 "$OLD_PID" 2>/dev/null || true
        sleep 2
        if kill -0 "$OLD_PID" 2>/dev/null; then
            kill -9 "$OLD_PID" 2>/dev/null || true
        fi
    fi
    rm -f "$PID_FILE"
fi

if which fuser >/dev/null 2>&1; then
    fuser -k 4000/tcp 2>/dev/null || true
elif which lsof >/dev/null 2>&1; then
    PORT_PID=$(lsof -ti :4000 2>/dev/null || true)
    if [ -n "$PORT_PID" ]; then
        kill -9 $PORT_PID 2>/dev/null || true
    fi
fi

# 3. Ortam Değişkenleri ve Başlatma
cd "$ROOT_DIR"
export PORT=4000
export HOST=127.0.0.1
export NODE_ENV=production

log "Backend başlatılıyor: nohup $NODE_BIN cpanel_api_entry.cjs..."
nohup "$NODE_BIN" cpanel_api_entry.cjs </dev/null >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
disown $NEW_PID 2>/dev/null || true
echo "$NEW_PID" > "$PID_FILE"
log "Backend API arka planda başlatıldı (PID: $NEW_PID)."

# 4. Sağlık Kontrolü Döngüsü (Health Check)
log "API sağlık kontrolü yapılıyor (http://127.0.0.1:4000/api/v1/health)..."
IS_READY=false
for i in {1..12}; do
    sleep 1
    if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:4000/api/v1/health" 2>/dev/null | grep -q "200"; then
        IS_READY=true
        break
    fi
done

if [ "$IS_READY" = true ]; then
    log "BAŞARILI: Backend API yanıt veriyor ve sağlıklı! (HTTP 200)"
else
    log "BİLGİ: Arka plan servisi başlatıldı (PID: $NEW_PID). İlk sağlık kontrolü yanıtı bekleniyor..."
fi

log "Backend başlatma süreci tamamlandı."
log "========================================================"
