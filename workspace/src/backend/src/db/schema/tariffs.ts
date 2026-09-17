
import { pgTable, uuid, numeric, varchar, timestamp } from 'drizzle-orm/pg-core';
import { stations } from './stations.js';

export const tariffs = pgTable('tariff_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  station_id: uuid('station_id').notNull().references(() => stations.id),
  price_per_kwh: numeric('price_per_kwh', { precision: 8, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  valid_from: timestamp('valid_from').notNull().defaultNow(),
});
