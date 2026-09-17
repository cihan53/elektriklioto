#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  elektriklioto.com cPanel Dağıtım Başlatıldı"
echo "  Tarih: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"

PROJ_DIR="$(pwd)"
echo "==> Proje dizini: $PROJ_DIR"

# 1. cPanel Ortamında Node.js ve npm Yollarının Tespiti
export PATH="/opt/cpanel/ea-nodejs20/bin:/opt/cpanel/ea-nodejs18/bin:$HOME/nodevenv/app/20/bin:$HOME/nodevenv/app/18/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$HOME/bin:$PATH"

NODE_BIN=""
if which node >/dev/null 2>&1; then
    NODE_BIN="$(which node)"
elif [ -f /usr/local/bin/node ]; then
    NODE_BIN="/usr/local/bin/node"
fi

NPM_BIN=""
if which npm >/dev/null 2>&1; then
    NPM_BIN="$(which npm)"
elif [ -f /usr/local/bin/npm ]; then
    NPM_BIN="/usr/local/bin/npm"
fi

if [ -z "$NODE_BIN" ] || [ -z "$NPM_BIN" ]; then
    echo "HATA: Node.js veya npm sistemde bulunamadı!"
    echo "Lütfen cPanel 'Setup Node.js App' üzerinden Node.js ortamını etkinleştirdiğinizden emin olunuz."
    exit 1
fi

echo "==> Kullanılan Node: $NODE_BIN ($($NODE_BIN -v))"
echo "==> Kullanılan npm:  $NPM_BIN ($($NPM_BIN -v))"

# 2. Gerekli Dizinlerin Hazırlanması
mkdir -p "$PROJ_DIR/tmp"
mkdir -p "$PROJ_DIR/logs"
mkdir -p "$PROJ_DIR/workspace/src/backend/src/data"

# 3. Backend (Fastify API) Bağımlılıkları ve Derleme
echo "==> [Backend] Bağımlılıklar kuruluyor ve derleniyor..."
cd "$PROJ_DIR/workspace/src/backend"

if [ -f "package-lock.json" ]; then
    $NPM_BIN ci --prefer-offline --no-audit || $NPM_BIN install --no-audit
else
    $NPM_BIN install --no-audit
fi

$NPM_BIN run build
echo "==> [Backend] Derleme tamamlandı (dist/ oluşturuldu)."

# 4. Frontend (Nuxt 3 Web) Bağımlılıkları ve Derleme
echo "==> [Frontend] Bağımlılıklar kuruluyor ve derleniyor..."
cd "$PROJ_DIR/workspace/src/frontend"

if [ -f "package-lock.json" ]; then
    $NPM_BIN ci --prefer-offline --no-audit || $NPM_BIN install --no-audit
else
    $NPM_BIN install --no-audit
fi

$NPM_BIN run build
echo "==> [Frontend] Nuxt Nitro derlemesi tamamlandı (.output/ oluşturuldu)."

# 5. Kök Dizin ve cPanel Passenger Tetikleme
cd "$PROJ_DIR"

# Passenger uygulamasını yeniden başlat
touch "$PROJ_DIR/tmp/restart.txt"
if [ -d "$PROJ_DIR/workspace/src/frontend/tmp" ]; then
    touch "$PROJ_DIR/workspace/src/frontend/tmp/restart.txt"
fi

# Betik izinlerini tazele
chmod +x "$PROJ_DIR/scripts/cron_daily_sync.sh" 2>/dev/null || true
chmod +x "$PROJ_DIR/scripts/import_cpo_stations.py" 2>/dev/null || true

echo "========================================================"
echo "  Dağıtım ve Yeniden Başlatma Başarıyla Tamamlandı!"
echo "  Tarih: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"
