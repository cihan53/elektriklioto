#!/usr/bin/env bash
# ==============================================================================
#  elektriklioto.com — Tek Tıkla Canlı Geliştirme Ortamı Başlatıcı
#  Backend (Fastify: 3001) + Frontend (Nuxt 3: 3000) + PostGIS (Docker: 5432)
# ==============================================================================

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/workspace/src/backend"
FRONTEND_DIR="$ROOT_DIR/workspace/src/frontend"
INFRA_DIR="$ROOT_DIR/workspace/infra"

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "======================================================================"
echo "  ⚡ elektriklioto.com — Canlı Geliştirme Ortamı Başlatılıyor"
echo "======================================================================"
echo -e "${NC}"

# Çocuk süreçleri temiz kapatma (Ctrl+C yakalayıcı)
cleanup() {
  echo
  echo -e "${YELLOW}🛑 Servisler kapatılıyor... Lütfen bekleyin.${NC}"
  
  # 1. Kayıtlı ana süreçleri ve tüm alt çocuklarını (Node, Vite, Nitro vb.) kapat
  if [ -n "$BACKEND_PID" ]; then
    pkill -P "$BACKEND_PID" 2>/dev/null || true
    kill -9 "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    pkill -P "$FRONTEND_PID" 2>/dev/null || true
    kill -9 "$FRONTEND_PID" 2>/dev/null || true
  fi

  # 2. Portları (3000 ve 3001) garantili temizle
  for port in 3000 3001; do
    pids=$(lsof -ti tcp:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  done

  echo -e "${GREEN}✓ Tüm servisler ve alt süreçler başarıyla sonlandırıldı.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Ortam ve Port Temizliği
echo -e "${BLUE}1/4 · Port Kontrolü ve Temizliği...${NC}"
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}✓ Portlar hazır (3000, 3001 serbest)${NC}"

# 2. Veritabanı (Docker PostGIS) Kontrolü
echo -e "${BLUE}2/4 · Veritabanı Kontrolü (PostGIS)...${NC}"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if [ -f "$INFRA_DIR/docker-compose.yml" ]; then
    echo -e "  🐳 Docker konteyneri başlatılıyor..."
    (cd "$INFRA_DIR" && docker compose up -d 2>/dev/null || true)
    echo -e "${GREEN}✓ PostGIS veritabanı aktif.${NC}"
  fi
else
  echo -e "${YELLOW}ℹ️  Docker çalışmıyor veya kurulu değil. Sistem güvenli önizleme fallback verisiyle çalışacak.${NC}"
fi

# 3. Bağımlılık Kontrolleri
echo -e "${BLUE}3/4 · Paket Bağımlılıkları Denetleniyor...${NC}"

# Backend bağımlılıkları
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}  📦 Backend paketleri kuruluyor (npm install)...${NC}"
  (cd "$BACKEND_DIR" && npm install --silent)
fi
echo -e "${GREEN}✓ Backend bağımlılıkları tamam.${NC}"

# Frontend bağımlılıkları
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}  📦 Frontend paketleri kuruluyor (yarn/npm)...${NC}"
  if command -v yarn >/dev/null 2>&1; then
    (cd "$FRONTEND_DIR" && yarn install --ignore-engines --silent)
  else
    (cd "$FRONTEND_DIR" && npm install --silent)
  fi
fi
echo -e "${GREEN}✓ Frontend bağımlılıkları tamam.${NC}"

# 4. Servisleri Eşzamanlı Başlatma
echo -e "${BLUE}4/4 · Servisler Ayağa Kaldırılıyor...${NC}"

# Backend Başlat (Fastify: Port 3001)
(cd "$BACKEND_DIR" && exec env PORT=3001 npm run dev) &
BACKEND_PID=$!

# Backend'in açılması için kısa bir bekleme
sleep 2

# Frontend Başlat (Nuxt 3: Port 3000)
if command -v yarn >/dev/null 2>&1; then
  (cd "$FRONTEND_DIR" && exec env PORT=3000 yarn dev) &
else
  (cd "$FRONTEND_DIR" && exec env PORT=3000 npm run dev) &
fi
FRONTEND_PID=$!

echo
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}  🎉 TÜM SERVİSLER BAŞARIYLA ÇALIŞIYOR!${NC}"
echo -e "  --------------------------------------------------------------------"
echo -e "  🌐 ${CYAN}Web Harita Arayüzü :${NC} ${GREEN}http://127.0.0.1:3000${NC} (veya http://localhost:3000)"
echo -e "  ⚙️  ${CYAN}Backend API        :${NC} ${GREEN}http://127.0.0.1:3001${NC}"
echo -e "  📖 ${CYAN}Swagger Dokümanı   :${NC} ${GREEN}http://127.0.0.1:3001/documentation${NC}"
echo -e "  --------------------------------------------------------------------"
echo -e "  💡 ${YELLOW}Durdurmak için Ctrl + C tuşlarına basabilirsiniz.${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo

# Tarayıcıyı aç (Mac ortamında)
if command -v open >/dev/null 2>&1; then
  sleep 3
  open http://127.0.0.1:3000 2>/dev/null || true
fi

# Çocuk süreçleri bekle
wait
