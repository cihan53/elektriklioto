#!/usr/bin/env bash
# ==============================================================================
#  elektriklioto.com — PostgreSQL & PostGIS Otomatik Kurulum ve Tohumlama Betiği
#  Bu betik sunucuda root veya sudo yetkisiyle çalıştırılır.
# ==============================================================================

set -e

# Renkler
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${CYAN}"
echo "======================================================================"
echo "  ⚡ elektriklioto.com — PostgreSQL & PostGIS Veritabanı Kurulumu"
echo "======================================================================"
echo -e "${NC}"

# 1. Root / Sudo Yetkisi Denetimi
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${YELLOW}Uyarı: Bu script veritabanı ve kullanıcı oluşturmak için root veya sudo yetkisi gerektirebilir.${NC}"
    echo -e "Eğer 'postgres' kullanıcısına şifresiz erişiminiz varsa devam edebilirsiniz.\n"
fi

# 2. PostgreSQL Servis Kontrolü
echo -e "${BLUE}1/6 · PostgreSQL Servis Durumu Kontrol Ediliyor...${NC}"
if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet postgresql 2>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL servisi aktif ve çalışıyor.${NC}"
    else
        echo -e "${YELLOW}PostgreSQL servisi başlatılıyor...${NC}"
        systemctl start postgresql || true
    fi
elif command -v service >/dev/null 2>&1; then
    service postgresql status >/dev/null 2>&1 || service postgresql start || true
fi

# 3. Parametreleri Belirleme
echo -e "\n${BLUE}2/6 · Veritabanı ve Kullanıcı Bilgileri${NC}"

DEFAULT_DB="elektriklioto_istasyon"
DEFAULT_USER="elektriklioto_user"
DEFAULT_PASS='i=J?Rflmij$45Fe3'
DEFAULT_PORT="5432"
DEFAULT_HOST="127.0.0.1"

read -r -p "Veritabanı Adı [$DEFAULT_DB]: " DB_NAME
DB_NAME="${DB_NAME:-$DEFAULT_DB}"

read -r -p "Veritabanı Kullanıcısı [$DEFAULT_USER]: " DB_USER
DB_USER="${DB_USER:-$DEFAULT_USER}"

read -r -p "Kullanıcı Şifresi [$DEFAULT_PASS]: " DB_PASS
DB_PASS="${DB_PASS:-$DEFAULT_PASS}"

read -r -p "PostgreSQL Portu [$DEFAULT_PORT]: " DB_PORT
DB_PORT="${DB_PORT:-$DEFAULT_PORT}"

# 4. Veritabanı ve Kullanıcı Oluşturma
echo -e "\n${BLUE}3/6 · Veritabanı ve Yetkiler Tanımlanıyor...${NC}"

PSQL_SUPER="sudo -u postgres psql"
if ! command -v sudo >/dev/null 2>&1 || [ "$(id -u)" -eq 0 ]; then
    PSQL_SUPER="su - postgres -c psql"
    if [ "$(id -un)" = "postgres" ]; then
        PSQL_SUPER="psql"
    fi
fi

# Kullanıcı var mı kontrol et, yoksa oluştur
$PSQL_SUPER -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
$PSQL_SUPER -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';"

# Şifreyi garanti güncelle
$PSQL_SUPER -c "ALTER USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';"

# Veritabanı var mı kontrol et, yoksa oluştur
$PSQL_SUPER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
$PSQL_SUPER -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"

$PSQL_SUPER -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";"

echo -e "${GREEN}✓ Kullanıcı ($DB_USER) ve Veritabanı ($DB_NAME) hazır.${NC}"

# 5. Eklentiler (uuid-ossp & postgis) Kurulumu
echo -e "\n${BLUE}4/6 · Eklentiler ve Yetkiler Yapılandırılıyor (uuid-ossp & postgis)...${NC}"

$PSQL_SUPER -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
$PSQL_SUPER -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || \
echo -e "${YELLOW}ℹ️  Not: postgis paketi sunucuda kurulu değilse standart koordinat indeksleriyle devam edilecek.${NC}"

$PSQL_SUPER -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO \"$DB_USER\";"
$PSQL_SUPER -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"$DB_USER\";"
$PSQL_SUPER -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"$DB_USER\";"
$PSQL_SUPER -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"$DB_USER\";"
$PSQL_SUPER -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO \"$DB_USER\";"

echo -e "${GREEN}✓ Eklentiler ve şema izinleri tanımlandı.${NC}"

# 6. Tablo Şemalarını Oluşturma (schema.sql)
echo -e "\n${BLUE}5/6 · Tablolar ve İndeksler Kuruluyor (schema.sql)...${NC}"
SCHEMA_FILE="$ROOT_DIR/scripts/schema.sql"
if [ -f "$SCHEMA_FILE" ]; then
    $PSQL_SUPER -d "$DB_NAME" -f "$SCHEMA_FILE" >/dev/null
    echo -e "${GREEN}✓ Tablolar başarıyla oluşturuldu (operator, station, connector vb.).${NC}"
else
    echo -e "${RED}Hata: schema.sql dosyası bulunamadı ($SCHEMA_FILE)!${NC}"
    exit 1
fi

# 7. İstasyon Verisini Tohumlama (seed_postgres.py)
echo -e "\n${BLUE}6/6 · 3600+ Şarj İstasyonu Veritabanına Aktarılıyor...${NC}"
cd "$ROOT_DIR"
PYTHON_BIN=".venv/bin/python"
[ -x "$PYTHON_BIN" ] || PYTHON_BIN="python3"

# seed_data.sql üret ve psql ile bas
$PYTHON_BIN scripts/seed_postgres.py >/dev/null
SEED_SQL="$ROOT_DIR/scripts/seed_data.sql"
if [ -f "$SEED_SQL" ]; then
    $PSQL_SUPER -d "$DB_NAME" -f "$SEED_SQL" >/dev/null
    echo -e "${GREEN}✓ İstasyonlar ve soketler veritabanına aktarıldı.${NC}"
fi

# 8. .env Dosyasını Güncelleme (Şifredeki ?, =, $ gibi özel karakterler için URL-encoding)
ENCODED_PASS="$($PYTHON_BIN -c "import sys, urllib.parse; print(urllib.parse.quote_plus(sys.argv[1]))" "$DB_PASS")"
DATABASE_URL="postgres://${DB_USER}:${ENCODED_PASS}@${DEFAULT_HOST}:${DB_PORT}/${DB_NAME}"

ENV_FILE="$ROOT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ROOT_DIR/.env.cpanel.example" ]; then
        cp "$ROOT_DIR/.env.cpanel.example" "$ENV_FILE"
    else
        touch "$ENV_FILE"
    fi
fi

# DATABASE_URL satırını güncelle veya ekle
if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    sed -i.bak -E "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
else
    echo "DATABASE_URL=${DATABASE_URL}" >> "$ENV_FILE"
fi

echo -e "\n======================================================================"
echo -e "${GREEN}🎉 KURULUM TAMAMLANDI!${NC}"
echo "======================================================================"
echo -e "• Veritabanı      : ${CYAN}${DB_NAME}${NC}"
echo -e "• Kullanıcı       : ${CYAN}${DB_USER}${NC}"
echo -e "• Şifre           : ${CYAN}${DB_PASS}${NC}"
echo -e "• Port            : ${CYAN}${DB_PORT}${NC}"
echo -e "• Bağlantı URL'i  : ${CYAN}${DATABASE_URL}${NC}"
echo -e "• .env Güncellendi: ${GREEN}✓ ($ENV_FILE)${NC}"

echo -e "\n${BLUE}Doğrulama Özeti:${NC}"
$PSQL_SUPER -d "$DB_NAME" -c "
SELECT 
    (SELECT count(*) FROM \"operator\") AS \"Operatör Sayısı\",
    (SELECT count(*) FROM \"station\") AS \"İstasyon Sayısı\",
    (SELECT count(*) FROM \"connector\") AS \"Soket Sayısı\";
"

echo -e "\n${GREEN}Servisleri yeniden başlatmak için:${NC}"
echo -e "  touch tmp/restart.txt  (cPanel Passenger için)"
echo -e "  veya local test için: ./canli.sh"
echo "======================================================================"
