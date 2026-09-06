
/* eslint-disable camelcase */

/**
 * Operasyon katmanı: job_queue (Redis/RabbitMQ yerine Postgres tabanlı kuyruk —
 * FOR UPDATE SKIP LOCKED deseniyle tüketilir), source_health, resolution_conflict.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('job_queue', {
    id: { type: 'bigserial', primaryKey: true },
    job_type: { type: 'text', notNull: true },
    payload: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    status: { type: 'text', notNull: true, default: 'pending' },
    attempts: { type: 'integer', notNull: true, default: 0 },
    run_after: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    last_error: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('job_queue', ['status', 'run_after']);
  pgm.addConstraint('job_queue', 'job_queue_status_check', {
    check: "status IN ('pending','processing','done','failed','dead')",
  });

  pgm.createTable('source_health', {
    source: { type: 'text', primaryKey: true },
    last_success_at: { type: 'timestamptz' },
    consecutive_failures: { type: 'integer', notNull: true, default: 0 },
    records: { type: 'integer', notNull: true, default: 0 },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('resolution_conflict', {
    id: { type: 'bigserial', primaryKey: true },
    raw_snapshot_id: { type: 'bigint', notNull: true, references: 'raw_station_snapshot', onDelete: 'CASCADE' },
    candidate_station_uid: { type: 'uuid', references: 'station', onDelete: 'SET NULL' },
    match_score: { type: 'numeric(4,3)' },
    reason: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'open' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    resolved_at: { type: 'timestamptz' },
  });
  pgm.createIndex('resolution_conflict', 'status');
};

exports.down = (pgm) => {
  pgm.dropTable('resolution_conflict');
  pgm.dropTable('source_health');
  pgm.dropTable('job_queue');
};
