
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Staging Ortamı Hızlı Başlatıcı
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "🚀 elektriklioto.com Staging ortamı başlatılıyor..."

if [ ! -f "${INFRA_DIR}/env/.env.staging" ]; then
  echo "⚠️  env/.env.staging bulunamadı, şablondan kopyalanıyor..."
  cp "${INFRA_DIR}/env/.env.staging.example" "${INFRA_DIR}/env/.env.staging"
fi

docker compose -f "${INFRA_DIR}/docker-compose.staging.yml" down -v --remove-orphans || true
docker compose -f "${INFRA_DIR}/docker-compose.staging.yml" up -d --build

echo "⏳ Servislerin hazır olması bekleniyor..."
sleep 5

docker compose -f "${INFRA_DIR}/docker-compose.staging.yml" ps
echo "✅ Staging ortamı başarıyla ayağa kalktı!"
