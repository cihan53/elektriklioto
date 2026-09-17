
-- ==============================================================================
-- Veritabanı İlklendirme: PostGIS & En Az Yetki (Least Privilege) Rolleri
-- ==============================================================================

-- PostGIS eklentisinin varlığını garanti et
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Göç Kullanıcısı (migrator_user - DDL ve Şema Göç Yetkisi)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'migrator_user') THEN
    CREATE ROLE migrator_user WITH LOGIN PASSWORD 'migrator_user_secure_pass';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE elektriklioto TO migrator_user;
GRANT ALL ON SCHEMA public TO migrator_user;

-- 2. Uygulama Kullanıcısı (app_user - Yalnızca DML: SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user WITH LOGIN PASSWORD 'app_user_secure_pass';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE elektriklioto TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
