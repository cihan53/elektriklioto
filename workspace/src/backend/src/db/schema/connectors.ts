
import { pgTable, uuid, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';
import { stations } from './stations.js';

export const connectors = pgTable('connector', {
  id: uuid('id').primaryKey().defaultRandom(),
  station_id: uuid('station_id').notNull().references(() => stations.id),
  socket_type: varchar('socket_type', { length: 50 }),
  power_kw: numeric('power_kw', { precision: 6, scale: 2 }),
  current_type: varchar('current_type', { length: 20 }),
  status: varchar('status', { length: 30 }),
  last_status_update: timestamp('last_status_update'),
});
