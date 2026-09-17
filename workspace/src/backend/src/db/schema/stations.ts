
import { pgTable, uuid, varchar, numeric, jsonb, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { operators } from './operators.js';

export const stations = pgTable('station', {
  id: uuid('id').primaryKey().defaultRandom(),
  istasyon_no: varchar('istasyon_no', { length: 64 }).notNull().unique(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  operator_id: integer('operator_id').notNull().references(() => operators.id),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 500 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }).notNull(),
  lat: numeric('lat', { precision: 10, scale: 6 }).notNull(),
  lon: numeric('lon', { precision: 10, scale: 6 }).notNull(),
  raw_metadata: jsonb('raw_metadata'),
  is_flagged_defective: boolean('is_flagged_defective').notNull().default(false),
  defect_report_count: integer('defect_report_count').notNull().default(0),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
