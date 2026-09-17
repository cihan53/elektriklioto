
import { pgTable, serial, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const seedRejects = pgTable('seed_rejects', {
  id: serial('id').primaryKey(),
  istasyonNo: varchar('istasyon_no', { length: 64 }),
  rejectionReason: text('rejection_reason').notNull(),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
