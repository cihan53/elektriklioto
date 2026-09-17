
import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { stations } from './stations.js';

/**
 * Kitle-kaynaklı arıza bildirimi (KVKK: Kullanıcı GPS konumu veya kimliği tutulmaz!)
 */
export const stationReports = pgTable(
  'station_report',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stationId: uuid('station_id').references(() => stations.id).notNull(),
    issueType: varchar('issue_type', { length: 64 }).notNull(), // broken, locked, iced, other
    proximityVerified: boolean('proximity_verified').default(false).notNull(),
    isSuppressed: boolean('is_suppressed').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_station_report_station_id').on(table.stationId),
  ]
);
