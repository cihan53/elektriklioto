
/* eslint-disable camelcase */

/**
 * Okuma yolu: station_read_model. Harita/liste sorguları 6 tabloyu runtime join
 * etmez; bu denormalize tablo üzerinden GIST + kısmi indeksle okur.
 * (Bu görev yalnızca şemayı kurar; ingestion'ın bu tabloyu doldurması ayrı bir
 * sprint görevinin kapsamındadır.)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('station_read_model', {
    station_uid: { type: 'uuid', primaryKey: true, references: 'station', onDelete: 'CASCADE' },
    operator_id: { type: 'integer', notNull: true },
    operator_code: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    province: { type: 'text' },
    district: { type: 'text' },
    facility_type: { type: 'text' },
    geom: { type: 'geometry(Point,4326)', notNull: true },
    max_power_kw: { type: 'numeric(6,2)', notNull: true, default: 0 },
    socket_count: { type: 'integer', notNull: true, default: 0 },
    connector_types: { type: 'text[]', notNull: true, default: pgm.func("'{}'::text[]") },
    status: { type: 'text', notNull: true, default: 'active' },
    freshness_seconds: { type: 'integer', notNull: true, default: 0 },
    refreshed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('station_read_model', 'geom', { method: 'gist' });
  pgm.createIndex('station_read_model', ['operator_id', 'max_power_kw']);
  pgm.createIndex('station_read_model', 'status', {
    name: 'station_read_model_active_idx',
    where: "status <> 'decommissioned'",
  });
};

exports.down = (pgm) => {
  pgm.dropTable('station_read_model');
};
