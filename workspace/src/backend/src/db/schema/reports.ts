
import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { stations } from './stations.js';

/**
 * Kitle Kaynaklı Arıza Bildirimi Tablosu (station_report)
 * 
 * KVKK / Konum Gizliliği Kuralı (ZORUNLU):
 * Bu tabloda kullanıcı koordinatı (lat, lon, geom), IP adresi veya kullanıcı kimlik sütunu
 * KESİNLİKLE BULUNMAZ. Yalnızca proximity_verified: true bayrağı ve station_id saklanır.
 */
export const stationReports = pgTable('station_report', {
  id: uuid('id').primaryKey().defaultRandom(),
  station_id: uuid('station_id').notNull().references(() => stations.id),
  issue_type: varchar('issue_type', { length: 50 }).notNull(), // DEFECTIVE, CABLE_LOCKED, ICE_BLOCK, ACCESS_ISSUE, OTHER
  description: text('description'),
  proximity_verified: boolean('proximity_verified').notNull().default(true),
  is_suppressed: boolean('is_suppressed').notNull().default(false), // Shadow-ban filtresi
  created_at: timestamp('created_at').notNull().defaultNow(),
});
