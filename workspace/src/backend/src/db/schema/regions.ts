import { pgTable, smallint, varchar, integer, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Issue #56: Kanonik il/ilçe referans tabloları.
 * İl anahtarı plaka kodudur (1-81); ilçe anahtarı plaka*1000 + GADM ilçe numarasıdır.
 * Sorgular metin yerine bu kodlarla yapılır; name/slug yalnızca görüntü ve URL içindir.
 */
export const il = pgTable('il', {
  plaka_kodu: smallint('plaka_kodu').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
});

export const ilce = pgTable(
  'ilce',
  {
    ilce_kodu: integer('ilce_kodu').primaryKey(),
    il_kodu: smallint('il_kodu').notNull().references(() => il.plaka_kodu),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 140 }).notNull(),
  },
  (t) => [uniqueIndex('uq_ilce_il_slug').on(t.il_kodu, t.slug)]
);
