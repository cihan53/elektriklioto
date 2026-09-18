
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Tek Tıkla Başlatıcı (On-Click Dev Launcher)
# Sprint: S1-S13 — Veritabanı, Backend API, Worker, Web SSR ve Sürüm Yönetimi
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${WORKSPACE_ROOT}/src/backend"
FRONTEND_DIR="${WORKSPACE_ROOT}/src/frontend"
MOBILE_DIR="${WORKSPACE_ROOT}/src/mobile"

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}⚡ elektriklioto.com — Tek Tıkla Geliştirici Başlatıcısı (S1-S13) ⚡${NC}"
echo -e "${CYAN}===================================================================${NC}"

# 1. Port Temizleme Fonksiyonu
cleanup_ports() {
  local ports=(3000 3001 5432)
  echo -e "${YELLOW}🔍 Çakışan portlar kontrol ediliyor: ${ports[*]}...${NC}"
  for port in "${ports[@]}"; do
    local pids
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo -e "${YELLOW}⚠️  Port $port üzerinde çalışan süreçler bulundu (PID: $pids). Temizleniyor...${NC}"
      kill -9 $pids 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}✅ Portlar temizlendi.${NC}"
}

# 2. Alt Süreçleri Temizleme (Ctrl+C Trapping)
PIDS=()
cleanup_all() {
  echo -e "\n${RED}🛑 Kapanma sinyali alındı! Tüm servisler kapatılıyor...${NC}"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${YELLOW}Durduruluyor: PID $pid${NC}"
      kill -TERM "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    fi
  done

  echo -e "${YELLOW}PostgreSQL Docker konteyneri durduruluyor...${NC}"
  docker compose -f "${SCRIPT_DIR}/docker-compose.yml" stop postgres >/dev/null 2>&1 || true

  echo -e "${GREEN}✅ Tüm servisler temiz bir şekilde sonlandırıldı.${NC}"
  exit 0
}

trap cleanup_all SIGINT SIGTERM EXIT

# 3. Ön Koşul ve Eksik Araç Denetimi
echo -e "${BLUE}📋 Ön koşullar ve araç zinciri denetleniyor...${NC}"

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ HATA: Node.js bulunamadı! Lütfen Node v22.x kurun.${NC}"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}❌ HATA: Docker bulunamadı! Lütfen Docker Engine başlatın.${NC}"
  exit 1
fi

# pnpm denetimi
PKG_MANAGER="npm"
if command -v pnpm >/dev/null 2>&1; then
  PKG_MANAGER="pnpm"
else
  echo -e "${YELLOW}⚠️  pnpm kurulu değil. Ortam standardı için npm kullanılıyor.${NC}"
fi

# Mobil Flutter denetimi
if command -v flutter >/dev/null 2>&1; then
  if flutter --version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Flutter SDK çalışır durumda.${NC}"
  else
    echo -e "${YELLOW}⚠️  Flutter kurulu ancak bozuk (Exec format error). Mobil derleme için onarım gereklidir.${NC}"
  fi
else
  echo -e "${YELLOW}ℹ️  Flutter PATH üzerinde bulunamadı. Mobil build için docker/Dockerfile.mobile-builder kullanılabilir.${NC}"
fi

# 4. Portları Temizle
cleanup_ports

# 5. Bağımlılıkları Kur
if [ -d "$BACKEND_DIR" ]; then
  if [ ! -d "${BACKEND_DIR}/node_modules" ]; then
    echo -e "${YELLOW}📦 Backend bağımlılıkları eksik, kuruluyor (${PKG_MANAGER})...${NC}"
    (cd "$BACKEND_DIR" && $PKG_MANAGER install)
  fi
  
  # CPO İstasyon Veri Tohumu Denetimi (TALEP-014)
  if [ ! -f "${BACKEND_DIR}/src/data/cpo_stations.json" ]; then
    mkdir -p "${BACKEND_DIR}/src/data"
    if [ -f "${WORKSPACE_ROOT}/../server-scripts/data/cpo_stations.json" ]; then
      cp -f "${WORKSPACE_ROOT}/../server-scripts/data/cpo_stations.json" "${BACKEND_DIR}/src/data/cpo_stations.json"
      echo -e "${GREEN}✅ CPO istasyon veri tohumu backend veri dizinine kopyalandı.${NC}"
    fi
  fi
  
  echo -e "${BLUE}🔨 Backend TypeScript derleniyor...${NC}"
  (cd "$BACKEND_DIR" && $PKG_MANAGER run build)
fi

# Frontend bağımlılıkları denetimi
if [ -d "$FRONTEND_DIR" ]; then
  if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
    echo -e "${YELLOW}📦 Frontend bağımlılıkları eksik, kuruluyor (${PKG_MANAGER})...${NC}"
    (cd "$FRONTEND_DIR" && $PKG_MANAGER install)
  fi
fi

# 6. Ortam Dosyalarını Hazırla
if [ ! -f "${SCRIPT_DIR}/env/.env" ]; then
  echo -e "${YELLOW}⚙️  env/.env bulunamadı. env/.env.example kopyalanıyor...${NC}"
  cp "${SCRIPT_DIR}/env/.env.example" "${SCRIPT_DIR}/env/.env"
fi

# 7. TALEP-012: Yerel Geliştirme Sürüm Dosyasını Hazırla
if [ -d "$FRONTEND_DIR" ]; then
  mkdir -p "${FRONTEND_DIR}/public"
  cat << JSON > "${FRONTEND_DIR}/public/version.json"
{
  "version": "1.0.0-dev",
  "buildId": "dev-local",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "timestamp": $(date +%s)
}
JSON
  echo -e "${GREEN}✅ Geliştirici version.json dosyası hazırlandı.${NC}"
fi

# 8. PostgreSQL + PostGIS Konteynerini Başlat
echo -e "${BLUE}🐘 PostgreSQL + PostGIS (16-3.4) başlatılıyor...${NC}"
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d postgres

echo -e "${BLUE}⏳ Veritabanı bağlantısı bekleniyor...${NC}"
RETRIES=20
until docker compose -f "${SCRIPT_DIR}/docker-compose.yml" exec -T postgres pg_isready -U postgres >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  sleep 1
  RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -eq 0 ]; then
  echo -e "${RED}❌ HATA: PostgreSQL konteyneri başlatılamadı veya zaman aşımına uğradı!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PostgreSQL + PostGIS veritabanı hazır (Port: 5432).${NC}"

# 9. Servisleri Paralel Ayağa Kaldır
echo -e "${PURPLE}🚀 Servisler başlatılıyor...${NC}"

# A) Fastify Backend API (:3000)
if [ -d "$BACKEND_DIR" ]; then
  echo -e "${CYAN}▶️  Fastify API Sunucusu (Port 3000) başlatılıyor...${NC}"
  (cd "$BACKEND_DIR" && $PKG_MANAGER run dev) &
  PIDS+=($!)
fi

# B) Bağımsız Worker Süreci
if [ -d "$BACKEND_DIR" ]; then
  echo -e "${CYAN}▶️  Aggregator Worker Süreci başlatılıyor...${NC}"
  (cd "$BACKEND_DIR" && $PKG_MANAGER run worker:dev) &
  PIDS+=($!)
fi

# C) Nuxt 3 Web SSR İstemcisi (:3001)
if [ -d "$FRONTEND_DIR" ]; then
  echo -e "${CYAN}▶️  Nuxt 3 Web İstemcisi (Port 3001) başlatılıyor...${NC}"
  (cd "$FRONTEND_DIR" && $PKG_MANAGER run dev) &
  PIDS+=($!)
fi

# 10. Başlangıç Özeti ve Sağlık Uç Noktaları
echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}🎉 Tüm sistem servisleri başarıyla ayağa kaldırıldı!${NC}"
echo -e "   - 🌐 Web İstemcisi:     http://localhost:3001"
echo -e "   - ⚡ Fastify API:       http://localhost:3000"
echo -e "   - 🩺 API Sağlık:        http://localhost:3000/health"
echo -e "   - 🐘 PostgreSQL:        localhost:5432 (Kullanıcı: postgres, DB: elektriklioto)"
echo -e "   - 🏷️  TALEP-012 Version: http://localhost:3001/version.json"
echo -e "   - 🛑 Çıkış Yapmak İçin:  Ctrl + C"
echo -e "${GREEN}===================================================================${NC}\n"

# Süreçleri canlı tut
wait
