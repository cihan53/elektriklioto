
import { pgTable, uuid, varchar, text, numeric, boolean, timestamp, jsonb, integer, serial } from 'drizzle-orm/pg-core';

export const operators = pgTable('operators', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  deep_link_config: jsonb('deep_link_config'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const stations = pgTable('stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  istasyon_no: varchar('istasyon_no', { length: 64 }).notNull().unique(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  operator_id: integer('operator_id').references(() => operators.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
  lon: numeric('lon', { precision: 10, scale: 7 }).notNull(),
  address: text('address'),
  city: varchar('city', { length: 64 }),
  district: varchar('district', { length: 64 }),
  raw_metadata: jsonb('raw_metadata'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const connectors = pgTable('connectors', {
  id: uuid('id').defaultRandom().primaryKey(),
  station_id: uuid('station_id').references(() => stations.id).notNull(),
  socket_type: varchar('socket_type', { length: 32 }),
  power_kw: numeric('power_kw', { precision: 6, scale: 2 }),
  current_type: varchar('current_type', { length: 16 }),
  status: varchar('status', { length: 32 }),
  last_status_update: timestamp('last_status_update'),
});

// KVKK gereği kullanıcı GPS koordinatı, IP veya kişisel veri tutulamaz.
export const station_reports = pgTable('station_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  station_id: uuid('station_id').references(() => stations.id).notNull(),
  issue_type: varchar('issue_type', { length: 64 }).notNull(),
  proximity_verified: boolean('proximity_verified').default(false).notNull(),
  is_suppressed: boolean('is_suppressed').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const tariff_history = pgTable('tariff_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  station_id: uuid('station_id').references(() => stations.id).notNull(),
  price_per_kwh: numeric('price_per_kwh', { precision: 10, scale: 4 }),
  currency: varchar('currency', { length: 8 }).default('TRY').notNull(),
  valid_from: timestamp('valid_from').defaultNow().notNull(),
});

export const seed_rejects = pgTable('seed_rejects', {
  id: serial('id').primaryKey(),
  istasyon_no: varchar('istasyon_no', { length: 64 }),
  raw_payload: jsonb('raw_payload').notNull(),
  rejection_reason: text('rejection_reason').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
