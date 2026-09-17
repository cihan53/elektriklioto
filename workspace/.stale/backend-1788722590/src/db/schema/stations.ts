
import { pgTable, uuid, varchar, text, numeric, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';
import { operators } from './operators.js';

// PostGIS geography(Point, 4326) özel sütun tanımı
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(Point,4326)';
  },
});

export const stations = pgTable(
  'station',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    istasyonNo: varchar('istasyon_no', { length: 64 }).notNull().unique(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    operatorId: integer('operator_id').references(() => operators.id),
    geom: geographyPoint('geom'),
    lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
    lon: numeric('lon', { precision: 10, scale: 7 }).notNull(),
    address: text('address'),
    city: varchar('city', { length: 64 }),
    district: varchar('district', { length: 64 }),
    rawMetadata: jsonb('raw_metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_station_slug').on(table.slug),
    index('idx_station_istasyon_no').on(table.istasyonNo),
    index('idx_station_operator_id').on(table.operatorId),
  ]
);
