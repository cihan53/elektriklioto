
import { pgTable, uuid, varchar, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { stations } from './stations.js';

/**
 * Faz 1 başlangıcında EPDK verisinde soket/güç bulunmadığından
 * bu tablo boştur ve alanlar NULL kabul edilir.
 */
export const connectors = pgTable(
  'connector',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stationId: uuid('station_id').references(() => stations.id).notNull(),
    socketType: varchar('socket_type', { length: 32 }), // CCS, Type 2, CHAdeMO
    powerKw: numeric('power_kw', { precision: 6, scale: 2 }),
    currentType: varchar('current_type', { length: 16 }), // AC, DC
    status: varchar('status', { length: 32 }),           // Available, Occupied, OutOfOrder
    lastStatusUpdate: timestamp('last_status_update', { withTimezone: true }),
  },
  (table) => [
    index('idx_connector_station_id').on(table.stationId),
  ]
);
