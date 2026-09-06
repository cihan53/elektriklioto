
/* eslint-disable camelcase */

/**
 * device + favorite tabloları.
 * (zorunlu) KVKK: Bu tablolarda kasıtlı olarak HİÇBİR geometry/lat/lon sütunu yoktur.
 * device_token yalnızca opak bir UUID'dir; kullanıcı↔konum ilişkisi kurulmaz.
 * Bkz. packages/db/scripts/verify-no-user-location-linkage.js
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('device', {
    device_token: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    trust_score: { type: 'numeric(3,2)', notNull: true, default: 0.5 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    last_seen_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('favorite', {
    id: 'id',
    device_token: { type: 'uuid', notNull: true, references: 'device', onDelete: 'CASCADE' },
    station_uid: { type: 'uuid', notNull: true, references: 'station', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('favorite', 'favorite_device_station_unique', {
    unique: ['device_token', 'station_uid'],
  });
  pgm.createIndex('favorite', 'device_token');
};

exports.down = (pgm) => {
  pgm.dropTable('favorite');
  pgm.dropTable('device');
};
