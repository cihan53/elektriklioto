#!/usr/bin/env bash
# ==============================================================================
#  elektriklioto.com — infra/canli.sh (Geriye Dönük Uyumluluk Yönlendiricisi)
#  Not: Kavram kargaşasını önlemek için 'canli.sh' ismi 'yerel_ortam.sh' olarak güncellenmiştir.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\033[1;33m⚠️  [BİLGİLENDİRME] 'canli.sh' ismi, canlı sistemle kavram kargaşasını önlemek amacıyla 'yerel_ortam.sh' olarak güncellenmiştir.\033[0m"
echo -e "\033[0;32m➡️  'yerel_ortam.sh' çalıştırılıyor...\033[0m\n"

exec "$SCRIPT_DIR/yerel_ortam.sh" "$@"
