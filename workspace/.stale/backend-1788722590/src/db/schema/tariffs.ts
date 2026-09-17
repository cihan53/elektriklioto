
import { pgTable, uuid, numeric, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { stations } from './stations.js';

/**
 * Fiyat ve tarife geçmişi tablosu (Faz 1'de başlangıçta NULL döner)
 */
export const tariffHistory = pgTable(
  'tariff_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stationId: uuid('station_id').references(() => stations.id).notNull(),
    pricePerKwh: numeric('price_per_kwh', { precision: 10, scale: 4 }),
    currency: varchar('currency', { length: 8 }).default('TRY'),
    validFrom: timestamp('valid_from', { withTimezone: true }).defaultNow(),
    source: varchar('source', { length: 64 }),
    confidence: varchar('confidence', { length: 32 }),
  },
  (table) => [
    index('idx_tariff_station_id').on(table.stationId),
  ]
);
