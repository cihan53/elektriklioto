#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  elektriklioto.com cPanel Dağıtım Başlatıldı"
echo "  Tarih: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"

PROJ_DIR="$(pwd)"
echo "==> Proje dizini: $PROJ_DIR"

# 1. Modern Node.js (>= 18) Tespiti ve Hazırlanması
find_modern_node() {
    local candidates=(
        "/opt/cpanel/ea-nodejs22/bin/node"
        "/opt/cpanel/ea-nodejs20/bin/node"
        "/opt/cpanel/ea-nodejs18/bin/node"
        "/opt/alt/alt-nodejs22/root/usr/bin/node"
        "/opt/alt/alt-nodejs20/root/usr/bin/node"
        "/opt/alt/alt-nodejs18/root/usr/bin/node"
        "$HOME/.local/node20/bin/node"
        "$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin/node"
        "$(which node 2>/dev/null || true)"
    )

    for cand in "${candidates[@]}"; do
        if [ -n "$cand" ] && [ -x "$cand" ]; then
            local ver
            ver="$($cand -v 2>/dev/null || true)"
            local major
            major=$(echo "$ver" | sed -E 's/^v([0-9]+).*/\1/')
            if [ -n "$major" ] && [ "$major" -ge 18 ]; then
                echo "$cand"
                return 0
            fi
        fi
    done
    return 1
}

NODE_BIN="$(find_modern_node || true)"

# Eğer sistemde modern Node.js yoksa kullanıcı dizinine Node v20 LTS indir
if [ -z "$NODE_BIN" ]; then
    echo "==> Sistemde modern Node.js (>= 18) bulunamadı. Kullanıcı dizinine ($HOME/.local/node20) Node.js v20 LTS kuruluyor..."
    mkdir -p "$HOME/.local"
    NODE_TAR="node-v20.18.0-linux-x64.tar.gz"
    NODE_URL="https://nodejs.org/dist/v20.18.0/$NODE_TAR"
    
    cd "$HOME/.local"
    if curl -fsSL "$NODE_URL" -o "$NODE_TAR"; then
        tar -xzf "$NODE_TAR"
        rm -rf node20
        mv node-v20.18.0-linux-x64 node20
        rm -f "$NODE_TAR"
        echo "==> Node.js v20 LTS başarıyla kuruldu."
    else
        echo "HATA: Node.js v20 indirilemedi!"
        exit 1
    fi
    cd "$PROJ_DIR"
    NODE_BIN="$HOME/.local/node20/bin/node"
fi

NODE_DIR="$(dirname "$NODE_BIN")"
export PATH="$NODE_DIR:$PATH"
NPM_BIN="$NODE_DIR/npm"

if [ ! -x "$NPM_BIN" ]; then
    NPM_BIN="$(which npm)"
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
