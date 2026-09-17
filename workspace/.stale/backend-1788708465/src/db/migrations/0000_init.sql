
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS operators (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  deep_link_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  istasyon_no VARCHAR(64) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  operator_id INTEGER NOT NULL REFERENCES operators(id),
  name VARCHAR(255) NOT NULL,
  lat NUMERIC(10, 7) NOT NULL,
  lon NUMERIC(10, 7) NOT NULL,
  address TEXT,
  city VARCHAR(64),
  district VARCHAR(64),
  raw_metadata JSONB,
  geom geography(Point, 4326),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_station_geom ON stations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_station_operator_id ON stations(operator_id);
CREATE INDEX IF NOT EXISTS idx_station_city_district ON stations(city, district);

CREATE TABLE IF NOT EXISTS connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  socket_type VARCHAR(32),
  power_kw NUMERIC(6, 2),
  current_type VARCHAR(16),
  status VARCHAR(32),
  last_status_update TIMESTAMP
);

CREATE TABLE IF NOT EXISTS station_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  issue_type VARCHAR(64) NOT NULL,
  proximity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tariff_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  price_per_kwh NUMERIC(10, 4),
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  valid_from TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seed_rejects (
  id SERIAL PRIMARY KEY,
  istasyon_no VARCHAR(64),
  raw_payload JSONB NOT NULL,
  rejection_reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
