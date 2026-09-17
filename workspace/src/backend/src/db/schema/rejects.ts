
import { pgTable, serial, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const seedRejects = pgTable('seed_rejects', {
  id: serial('id').primaryKey(),
  istasyon_no: varchar('istasyon_no', { length: 64 }).notNull(),
  raw_payload: jsonb('raw_payload').notNull(),
  rejection_reason: varchar('rejection_reason', { length: 255 }).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
