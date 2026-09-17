
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Otomatik Staging Dağıtım Betiği
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "📦 Staging dağıtımı başlatılıyor..."

cd "$INFRA_DIR"

if [ ! -f "env/.env.staging" ]; then
  cp "env/.env.staging.example" "env/.env.staging"
fi

# Konteynerleri derle ve güncelle
docker compose -f docker-compose.staging.yml build --no-cache
docker compose -f docker-compose.staging.yml up -d

# Sağlık denetimlerini çalıştır
echo "🔍 Staging sağlık denetimleri yapılıyor..."
bash "${SCRIPT_DIR}/healthcheck-s3.sh"

echo "🎉 Staging dağıtımı başarıyla tamamlandı!"
