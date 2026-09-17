-- ==============================================================================
-- elektriklioto.com - PostgreSQL & PostGIS Veritabanı Şeması (DDL)
-- pgAdmin Query Tool veya psql ile çalıştırılabilir.
-- ==============================================================================

-- 1. Gerekli Eklentiler (Extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- PostGIS kuruluysa aktif et (kurulu değilse koordinatlar lat/lon indeksleriyle çalışır)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'PostGIS eklentisi bulunamadı, standart koordinat indeksleri kullanılacak.';
END $$;

-- 2. Operatörler Tablosu (operator)
CREATE TABLE IF NOT EXISTS "operator" (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    deep_link_config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. İstasyonlar Tablosu (station)
CREATE TABLE IF NOT EXISTS "station" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    istasyon_no VARCHAR(64) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    operator_id INTEGER NOT NULL REFERENCES "operator"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    lat NUMERIC(10, 6) NOT NULL,
    lon NUMERIC(10, 6) NOT NULL,
    raw_metadata JSONB,
    is_flagged_defective BOOLEAN NOT NULL DEFAULT false,
    defect_report_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Soketler ve Konnektörler (connector)
CREATE TABLE IF NOT EXISTS "connector" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES "station"(id) ON DELETE CASCADE,
    socket_type VARCHAR(50), -- Type 2, CCS, CHAdeMO
    power_kw NUMERIC(6, 2),
    current_type VARCHAR(20), -- AC, DC
    status VARCHAR(30) DEFAULT 'AVAILABLE',
    last_status_update TIMESTAMP WITHOUT TIME ZONE
);

-- 5. Tarife Geçmişi (tariff_history)
CREATE TABLE IF NOT EXISTS "tariff_history" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES "station"(id) ON DELETE CASCADE,
    price_per_kwh NUMERIC(8, 2),
    currency VARCHAR(10) DEFAULT 'TRY',
    valid_from TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Kitle Kaynaklı Arıza Bildirimleri (station_report)
CREATE TABLE IF NOT EXISTS "station_report" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES "station"(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,
    description TEXT,
    proximity_verified BOOLEAN NOT NULL DEFAULT true,
    is_suppressed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Sistem Asenkron İş Kuyruğu (sys_job_queue)
CREATE TABLE IF NOT EXISTS "sys_job_queue" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    run_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMP WITHOUT TIME ZONE,
    locked_by VARCHAR(100),
    last_error TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. CPO Veri Kaynakları Sağlık Durumu (source_health)
CREATE TABLE IF NOT EXISTS "source_health" (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER NOT NULL REFERENCES "operator"(id) ON DELETE CASCADE,
    source_name VARCHAR(100) NOT NULL,
    endpoint_url VARCHAR(500) NOT NULL,
    circuit_state VARCHAR(20) NOT NULL DEFAULT 'CLOSED',
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_successful_sync TIMESTAMP WITHOUT TIME ZONE,
    last_attempt_at TIMESTAMP WITHOUT TIME ZONE,
    last_error TEXT,
    is_healthy BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Reddedilen Kayıtlar (seed_rejects)
CREATE TABLE IF NOT EXISTS "seed_rejects" (
    id SERIAL PRIMARY KEY,
    istasyon_no VARCHAR(64) NOT NULL,
    raw_payload JSONB NOT NULL,
    rejection_reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Performans ve Arama İndeksleri (B-Tree & Koordinat)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_station_city ON "station"(city);
CREATE INDEX IF NOT EXISTS idx_station_district ON "station"(district);
CREATE INDEX IF NOT EXISTS idx_station_operator_id ON "station"(operator_id);
CREATE INDEX IF NOT EXISTS idx_station_coords ON "station"(lat, lon);
CREATE INDEX IF NOT EXISTS idx_connector_station ON "connector"(station_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON "sys_job_queue"(status, run_at);

-- ==============================================================================
-- Temel Operatör Tohum Verisi (ZES, Trugo, Eşarj, Voltrun, Sharz.net)
-- ==============================================================================
INSERT INTO "operator" (id, slug, name, deep_link_config, is_active) VALUES
(1, 'zes', 'ZES', '{"scheme": "zes://station/{station_code}"}'::jsonb, true),
(2, 'trugo', 'Trugo', '{"scheme": "trugo://charge?station={station_code}"}'::jsonb, true),
(3, 'esarj', 'Eşarj', '{"scheme": "esarj://station/{station_code}"}'::jsonb, true),
(4, 'voltrun', 'Voltrun', null, true),
(5, 'sharznet', 'Sharz.net', null, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    deep_link_config = EXCLUDED.deep_link_config;

-- Otomatik ID sayacını güncelle
SELECT setval(pg_get_serial_sequence('operator', 'id'), (SELECT MAX(id) FROM "operator"));
