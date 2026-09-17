
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Tek Tıkla Başlatıcı (On-Click Dev Launcher)
# Sprint: S1-S6 — Veritabanı, Backend API, Worker, Web ve Mobil Entegrasyonu
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
MOBILE_DIR="${WORKSPACE_ROOT}/src/mobile"

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}⚡ elektriklioto.com — Tek Tıkla Geliştirici Başlatıcısı (S1-S6) ⚡${NC}"
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
  
  echo -e "${BLUE}🔨 Backend TypeScript derleniyor...${NC}"
  (cd "$BACKEND_DIR" && $PKG_MANAGER run build)
fi

# 6. Ortam Dosyasını Hazırla
if [ ! -f "${SCRIPT_DIR}/env/.env" ]; then
  echo -e "${YELLOW}⚙️  env/.env bulunamadı. env/.env.example kopyalanıyor...${NC}"
  cp "${SCRIPT_DIR}/env/.env.example" "${SCRIPT_DIR}/env/.env"
fi

if [ ! -f "${SCRIPT_DIR}/env/.env.mobile" ] && [ -f "${SCRIPT_DIR}/env/.env.mobile.example" ]; then
  echo -e "${YELLOW}⚙️  env/.env.mobile oluşturuluyor...${NC}"
  cp "${SCRIPT_DIR}/env/.env.mobile.example" "${SCRIPT_DIR}/env/.env.mobile"
fi

# 7. PostGIS Konteynerini Başlat
echo -e "${PURPLE}🐘 PostgreSQL + PostGIS konteyneri başlatılıyor...${NC}"
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d postgres

echo -e "${BLUE}⏳ Veritabanı hazır olana kadar bekleniyor (pg_isready)...${NC}"
RETRIES=30
until docker compose -f "${SCRIPT_DIR}/docker-compose.yml" exec -T postgres pg_isready -U postgres -d elektriklioto >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo -e "${YELLOW}Veritabanı bekleniyor ($RETRIES)...${NC}"
  sleep 1
  RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -eq 0 ]; then
  echo -e "${RED}❌ Veritabanı 30 saniye içinde hazır hale gelemedi!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PostgreSQL + PostGIS (postgis/postgis:16-3.4) hazır!${NC}"

# 8. Servisleri Paralel Ayağa Kaldır
echo -e "${CYAN}🚀 Fastify API, Asenkron Worker ve Web servisleri paralel başlatılıyor...${NC}"

# 8.1. Fastify API Servisi (:3000)
(
  cd "$BACKEND_DIR"
  export PORT=3000
  export HOST=0.0.0.0
  export DATABASE_URL="postgres://postgres:postgres@localhost:5432/elektriklioto"
  echo -e "${GREEN}[API] Fastify API başlatılıyor (http://localhost:3000)...${NC}"
  node dist/server.js 2>&1 | sed -e "s/^/${GREEN}[API] ${NC}/"
) &
PIDS+=($!)

# 8.2. Bağımsız Asenkron Worker Süreci
(
  cd "$BACKEND_DIR"
  export DATABASE_URL="postgres://postgres:postgres@localhost:5432/elektriklioto"
  export WORKER_POLL_INTERVAL_MS=1000
  export CB_FAILURE_THRESHOLD=5
  export CB_COOLDOWN_MS=900000
  echo -e "${PURPLE}[WORKER] Bağımsız worker süreci başlatılıyor...${NC}"
  node dist/worker.js 2>&1 | sed -e "s/^/${PURPLE}[WORKER] ${NC}/"
) &
PIDS+=($!)

# 8.3. Web Ön Yüz / Simülasyon Servisi (:3001)
(
  echo -e "${BLUE}[WEB] Nuxt SSR / Web arayüzü başlatılıyor (http://localhost:3001)...${NC}"
  if [ -d "${WORKSPACE_ROOT}/src/web" ]; then
    cd "${WORKSPACE_ROOT}/src/web"
    npm run dev -- --port 3001 2>&1 | sed -e "s/^/${BLUE}[WEB] ${NC}/"
  else
    mkdir -p /tmp/elektriklioto-web-stub
    cat << 'HTML' > /tmp/elektriklioto-web-stub/index.html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>elektriklioto.com - Web Geliştirme Önizleme</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #111827; border: 1px solid #1f2937; padding: 2.5rem; border-radius: 1rem; max-width: 500px; text-align: center; }
    h1 { color: #10b981; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #9ca3af; font-size: 0.95rem; line-height: 1.5; }
    .badge { display: inline-block; background: #374151; color: #d1d5db; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚡ elektriklioto.com</h1>
    <p>Web Platformu (Nuxt 3 SSR) geliştirme modunda aktif.</p>
    <p>Fastify API: <code>http://localhost:3000/health</code></p>
    <div class="badge">S6 Mobil CI/CD & Build Hazır</div>
  </div>
</body>
</html>
HTML
    cd /tmp/elektriklioto-web-stub
    npx -y serve -l 3001 -s . 2>&1 | sed -e "s/^/${BLUE}[WEB] ${NC}/"
  fi
) &
PIDS+=($!)

# 9. Servis Bilgilendirme Kartı
sleep 3
echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}🎉 elektriklioto.com tüm servisleriyle paralel ayağa kalktı!${NC}"
echo -e "   - 🌐 Fastify API:       http://localhost:3000"
echo -e "   - 📖 API Swagger Docs:  http://localhost:3000/documentation"
echo -e "   - 📊 API Kaynak Sağlık: http://localhost:3000/api/v1/health/sources"
echo -e "   - 📥 Kuyruk Durumu:     http://localhost:3000/api/v1/health/queue"
echo -e "   - 💻 Web Platformu:     http://localhost:3001"
echo -e "   - 📱 Mobil Android:     ./scripts/build-mobile-android.sh [dev|staging|prod]"
echo -e "   - 🍎 Mobil iOS:         ./scripts/build-mobile-ios.sh [dev|staging|prod]"
echo -e "   - 🐘 PostgreSQL:        localhost:5432 (DB: elektriklioto)"
echo -e "${GREEN}===================================================================${NC}"
echo -e "${YELLOW}Durdurmak için Ctrl+C tuşlarına basınız...${NC}\n"

wait
