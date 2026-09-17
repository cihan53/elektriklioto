
-- ==============================================================================
-- Migration: 0000_initial_schema
-- Açıklama: PostGIS eklentisi, kanonik istasyon, operatör, spatial indeksler
--           ve KVKK uyumlu partitioned tabloların oluşturulması
-- ==============================================================================

-- 1. Gerekli Eklentiler
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Operatör Tablosu (179 Marka Sözlüğü)
CREATE TABLE IF NOT EXISTS operator (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  deep_link_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. İstasyon Tablosu (Kanonik Çapa: istasyon_no)
CREATE TABLE IF NOT EXISTS station (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  istasyon_no TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  operator_id INTEGER REFERENCES operator(id) ON DELETE RESTRICT,
  geom GEOGRAPHY(Point, 4326),
  lat NUMERIC(10, 7) NOT NULL,
  lon NUMERIC(10, 7) NOT NULL,
  address TEXT,
  city TEXT,
  district TEXT,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- lat / lon alanlarından geom (SRID 4326) otomatik üretim tetikleyicisi
CREATE OR REPLACE FUNCTION update_station_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lon IS NOT NULL AND NEW.lat IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_station_geom ON station;
CREATE TRIGGER trg_station_geom
BEFORE INSERT OR UPDATE OF lat, lon ON station
FOR EACH ROW
EXECUTE FUNCTION update_station_geom();

-- Zorunlu Spatial GIST İndeksi (p95 < 40ms hedefi)
CREATE INDEX IF NOT EXISTS idx_station_geom ON station USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_station_operator_id ON station(operator_id);
CREATE INDEX IF NOT EXISTS idx_station_slug ON station(slug);
CREATE INDEX IF NOT EXISTS idx_station_city_district ON station(city, district);
CREATE INDEX IF NOT EXISTS idx_operator_slug ON operator(slug);

-- 4. Soket Tablosu (Faz 1 Başlangıcında Alanlar NULL)
CREATE TABLE IF NOT EXISTS connector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  socket_type VARCHAR(50),
  power_kw NUMERIC(6, 2),
  current_type VARCHAR(20),
  status VARCHAR(50),
  last_status_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_connector_station_id ON connector(station_id);

-- 5. Kitle Kaynaklı Arıza Bildirimleri (KVKK Sıfır Konum Saklama - Aylık Partitioning)
CREATE TABLE IF NOT EXISTS station_report (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  issue_type VARCHAR(50) NOT NULL,
  proximity_verified BOOLEAN NOT NULL DEFAULT false,
  is_suppressed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 2026 Aylık Bölümleri ve Varsayılan Bölüm
CREATE TABLE IF NOT EXISTS station_report_y2026m01 PARTITION OF station_report FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m02 PARTITION OF station_report FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m03 PARTITION OF station_report FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m04 PARTITION OF station_report FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m05 PARTITION OF station_report FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m06 PARTITION OF station_report FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m07 PARTITION OF station_report FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m08 PARTITION OF station_report FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m09 PARTITION OF station_report FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m10 PARTITION OF station_report FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m11 PARTITION OF station_report FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_y2026m12 PARTITION OF station_report FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS station_report_default PARTITION OF station_report DEFAULT;

-- 6. Tarife Geçmişi Tablosu (Aylık Partitioning)
CREATE TABLE IF NOT EXISTS tariff_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  price_per_kwh NUMERIC(8, 2),
  currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
  source TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  confidence NUMERIC(3, 2),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 2026 Aylık Bölümleri ve Varsayılan Bölüm
CREATE TABLE IF NOT EXISTS tariff_history_y2026m01 PARTITION OF tariff_history FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m02 PARTITION OF tariff_history FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m03 PARTITION OF tariff_history FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m04 PARTITION OF tariff_history FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m05 PARTITION OF tariff_history FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m06 PARTITION OF tariff_history FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m07 PARTITION OF tariff_history FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m08 PARTITION OF tariff_history FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m09 PARTITION OF tariff_history FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m10 PARTITION OF tariff_history FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m11 PARTITION OF tariff_history FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_y2026m12 PARTITION OF tariff_history FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS tariff_history_default PARTITION OF tariff_history DEFAULT;

-- 7. Tohumlama Reddedilen Kayıtlar Tablosu
CREATE TABLE IF NOT EXISTS seed_rejects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  istasyon_no TEXT,
  raw_data JSONB,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PostgreSQL SKIP LOCKED İş Kuyruğu Tablosu
CREATE TABLE IF NOT EXISTS sys_job_queue (
  id BIGSERIAL PRIMARY KEY,
  queue VARCHAR(50) NOT NULL DEFAULT 'default',
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_fetch ON sys_job_queue(queue, status, run_at) WHERE status = 'pending';
