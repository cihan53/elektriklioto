
import { pgTable, serial, varchar, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';

export const operators = pgTable('operator', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  deep_link_config: jsonb('deep_link_config').$type<{
    scheme?: string;
    android_package?: string;
    ios_app_store_id?: string;
    clipboard_fallback?: boolean;
  }>(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
