
import { pgTable, serial, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export interface DeepLinkConfig {
  iosSchemeTemplate?: string | null;
  androidSchemeTemplate?: string | null;
  universalLinkTemplate?: string | null;
  storeUrls?: {
    ios?: string | null;
    android?: string | null;
  };
  clipboardFallback: boolean;
  notes?: string | null;
}

export const operators = pgTable('operator', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  deepLinkConfig: jsonb('deep_link_config').$type<DeepLinkConfig>().default({
    clipboardFallback: true,
  }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
