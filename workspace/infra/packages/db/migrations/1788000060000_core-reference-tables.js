
/* eslint-disable camelcase */

/**
 * Kanonik referans katmanı: operator, station, socket, tariff, station_source_link
 * ve ham katman: raw_station_snapshot (append-only, asla UPDATE edilmez).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('operator', {
    id: 'id',
    code: { type: 'text', notNull: true, unique: true },
    name: { type: 'text', notNull: true },
    deeplink_scheme: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('station', {
    station_uid: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: { type: 'integer', notNull: true, references: 'operator', onDelete: 'RESTRICT' },
    name: { type: 'text', notNull: true },
    address: { type: 'text' },
    province: { type: 'text' },
    district: { type: 'text' },
    facility_type: { type: 'text' },
    // İstasyon konumu kamuya açık, sabit bir tesis noktasıdır; kullanıcı↔koordinat
    // ilişkisi DEĞİLDİR (bkz. KVKK kısıtı — bu kısıt device/favorite/fault_report içindir).
    geom: { type: 'geometry(Point,4326)', notNull: true },
    status: { type: 'text', notNull: true, default: 'active' },
    merged_into: { type: 'uuid', references: 'station', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('station', 'geom', { method: 'gist' });
  pgm.createIndex('station', 'operator_id');

  pgm.createTable('socket', {
    id: 'id',
    station_uid: { type: 'uuid', notNull: true, references: 'station', onDelete: 'CASCADE' },
    connector_type: { type: 'text', notNull: true },
    power_kw: { type: 'numeric(6,2)', notNull: true },
    current_type: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'unknown' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('socket', 'station_uid');

  pgm.createTable('tariff', {
    id: 'id',
    station_uid: { type: 'uuid', notNull: true, references: 'station', onDelete: 'CASCADE' },
    source: { type: 'text', notNull: true },
    price_per_kwh: { type: 'numeric(8,4)' },
    price_per_min: { type: 'numeric(8,4)' },
    currency: { type: 'text', notNull: true, default: 'TRY' },
    confidence: { type: 'numeric(3,2)', notNull: true, default: 0.5 },
    fetched_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('tariff', 'station_uid');

  pgm.createTable('station_source_link', {
    id: 'id',
    station_uid: { type: 'uuid', notNull: true, references: 'station', onDelete: 'CASCADE' },
    source: { type: 'text', notNull: true },
    source_id: { type: 'text', notNull: true },
    match_score: { type: 'numeric(4,3)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('station_source_link', 'station_source_link_source_unique', {
    unique: ['source', 'source_id'],
  });

  // Ham katman: kaynaktan gelen değiştirilmemiş kayıt, append-only.
  pgm.createTable('raw_station_snapshot', {
    id: { type: 'bigserial', primaryKey: true },
    source: { type: 'text', notNull: true },
    source_id: { type: 'text', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    fetched_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('raw_station_snapshot', ['source', 'source_id']);
  pgm.createIndex('raw_station_snapshot', 'fetched_at');
};

exports.down = (pgm) => {
  pgm.dropTable('raw_station_snapshot');
  pgm.dropTable('station_source_link');
  pgm.dropTable('tariff');
  pgm.dropTable('socket');
  pgm.dropTable('station');
  pgm.dropTable('operator');
};
