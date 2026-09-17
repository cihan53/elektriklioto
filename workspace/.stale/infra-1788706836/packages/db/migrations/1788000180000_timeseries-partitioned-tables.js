
/* eslint-disable camelcase */

/**
 * Zaman serisi katmanı: availability_event, tariff_history, fault_report.
 * Aylık RANGE partition; BRIN indeks (partition başına küçük indeks).
 *
 * NOT: node-pg-migrate'in yerleşik bir partition yardımcı fonksiyonu olmadığından
 * DDL burada ham SQL ile yazılmıştır. Üretimde yeni ayların partition'larını
 * otomatik oluşturan zamanlanmış bir bakım job'ı ayrı bir görevin kapsamındadır;
 * burada yalnızca bootstrap için cari ay + 2 ay ileri partition açılır.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE availability_event (
      id bigserial,
      station_uid uuid NOT NULL REFERENCES station(station_uid) ON DELETE CASCADE,
      socket_id integer REFERENCES socket(id) ON DELETE SET NULL,
      status text NOT NULL,
      source text NOT NULL,
      occurred_at timestamptz NOT NULL,
      PRIMARY KEY (id, occurred_at)
    ) PARTITION BY RANGE (occurred_at);
  `);
  pgm.sql(`CREATE INDEX availability_event_occurred_at_brin ON availability_event USING brin (occurred_at);`);
  pgm.sql(`CREATE INDEX availability_event_station_uid_idx ON availability_event (station_uid);`);

  pgm.sql(`
    CREATE TABLE tariff_history (
      id bigserial,
      station_uid uuid NOT NULL REFERENCES station(station_uid) ON DELETE CASCADE,
      source text NOT NULL,
      price_per_kwh numeric(8,4),
      price_per_min numeric(8,4),
      occurred_at timestamptz NOT NULL,
      PRIMARY KEY (id, occurred_at)
    ) PARTITION BY RANGE (occurred_at);
  `);
  pgm.sql(`CREATE INDEX tariff_history_occurred_at_brin ON tariff_history USING brin (occurred_at);`);
  pgm.sql(`CREATE INDEX tariff_history_station_uid_idx ON tariff_history (station_uid);`);

  // (zorunlu) KVKK: bu tabloda kullanıcıya bağlı geçmiş koordinat/güzergah TUTULMAZ.
  // device_token yalnızca sayım/skor amaçlı opak bir referanstır, konum sütunu yoktur.
  pgm.sql(`
    CREATE TABLE fault_report (
      id bigserial,
      station_uid uuid NOT NULL REFERENCES station(station_uid) ON DELETE CASCADE,
      device_token uuid,
      reason text NOT NULL,
      proximity_proof text NOT NULL,
      occurred_at timestamptz NOT NULL,
      PRIMARY KEY (id, occurred_at)
    ) PARTITION BY RANGE (occurred_at);
  `);
  pgm.sql(`CREATE INDEX fault_report_occurred_at_brin ON fault_report USING brin (occurred_at);`);
  pgm.sql(`CREATE INDEX fault_report_station_uid_idx ON fault_report (station_uid);`);

  // Bootstrap partition'ları: cari ay ve gelecek 2 ay.
  pgm.sql(`
    DO $$
    DECLARE
      base date := date_trunc('month', now())::date;
      i integer;
      part_start date;
      part_end date;
      suffix text;
    BEGIN
      FOR i IN 0..2 LOOP
        part_start := (base + (i || ' month')::interval)::date;
        part_end := (base + ((i + 1) || ' month')::interval)::date;
        suffix := to_char(part_start, 'YYYY_MM');

        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS availability_event_%s PARTITION OF availability_event FOR VALUES FROM (%L) TO (%L)',
          suffix, part_start, part_end
        );
        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS tariff_history_%s PARTITION OF tariff_history FOR VALUES FROM (%L) TO (%L)',
          suffix, part_start, part_end
        );
        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS fault_report_%s PARTITION OF fault_report FOR VALUES FROM (%L) TO (%L)',
          suffix, part_start, part_end
        );
      END LOOP;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS fault_report CASCADE;');
  pgm.sql('DROP TABLE IF EXISTS tariff_history CASCADE;');
  pgm.sql('DROP TABLE IF EXISTS availability_event CASCADE;');
};
