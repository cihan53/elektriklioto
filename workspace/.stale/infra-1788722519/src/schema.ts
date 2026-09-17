
import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  boolean,
  timestamp,
  serial,
  bigserial,
  integer,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";

/**
 * PostGIS geography(Point, 4326) özel sütun tanımı
 */
export const postgisGeography = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geography(Point, 4326)";
  },
});

/**
 * Operatör Sözlüğü Tablosu (179 CPO Markası)
 */
export const operator = pgTable("operator", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: text("name").notNull(),
  deepLinkConfig: jsonb("deep_link_config"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Şarj İstasyonu Tablosu (EPDK 16.788 İstasyon Çapası)
 */
export const station = pgTable("station", {
  id: uuid("id").defaultRandom().primaryKey(),
  istasyonNo: text("istasyon_no").notNull().unique(), // Resmî EPDK çapa no (örn: 'ŞRJ/xxxx')
  slug: text("slug").notNull().unique(),
  operatorId: integer("operator_id").references(() => operator.id),
  geom: postgisGeography("geom"),
  lat: numeric("lat", { precision: 10, scale: 7 }).notNull(),
  lon: numeric("lon", { precision: 10, scale: 7 }).notNull(),
  address: text("address"),
  city: text("city"),
  district: text("district"),
  rawMetadata: jsonb("raw_metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * İstasyon Soket Tablosu (Faz 1 başlangıcında NULL kabul edilir)
 */
export const connector = pgTable("connector", {
  id: uuid("id").defaultRandom().primaryKey(),
  stationId: uuid("station_id")
    .notNull()
    .references(() => station.id, { onDelete: "cascade" }),
  socketType: varchar("socket_type", { length: 50 }), // Faz 1'de NULL
  powerKw: numeric("power_kw", { precision: 6, scale: 2 }), // Faz 1'de NULL
  currentType: varchar("current_type", { length: 20 }), // Faz 1'de NULL (AC / DC)
  status: varchar("status", { length: 50 }), // Faz 1'de NULL
  lastStatusUpdate: timestamp("last_status_update", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Kitle Kaynaklı İstasyon Arıza Bildirimi (KVKK Sıfır Konum Saklama İlkesi)
 * NOT: Ham kullanıcı koordinatı saklanmaz; yalnızca proximity_verified tutulur.
 * Fiziksel veritabanında created_at üzerinden aylık bölümlenmiştir (partitioned).
 */
export const stationReport = pgTable("station_report", {
  id: uuid("id").defaultRandom().notNull(),
  stationId: uuid("station_id")
    .notNull()
    .references(() => station.id, { onDelete: "cascade" }),
  issueType: varchar("issue_type", { length: 50 }).notNull(),
  proximityVerified: boolean("proximity_verified").default(false).notNull(),
  isSuppressed: boolean("is_suppressed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * İstasyon Tarife Geçmişi (Faz 1 başlangıcında NULL kabul edilir)
 * Fiziksel veritabanında created_at üzerinden aylık bölümlenmiştir (partitioned).
 */
export const tariffHistory = pgTable("tariff_history", {
  id: uuid("id").defaultRandom().notNull(),
  stationId: uuid("station_id")
    .notNull()
    .references(() => station.id, { onDelete: "cascade" }),
  pricePerKwh: numeric("price_per_kwh", { precision: 8, scale: 2 }), // Faz 1'de NULL
  currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
  source: text("source"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }),
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Tohumlama Reddedilen Kayıtlar Tablosu (Türkiye BBox dışı veya hatalı koordinatlar)
 */
export const seedRejects = pgTable("seed_rejects", {
  id: uuid("id").defaultRandom().primaryKey(),
  istasyonNo: text("istasyon_no"),
  rawData: jsonb("raw_data"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * PostgreSQL FOR UPDATE SKIP LOCKED İş Kuyruğu Tablosu
 */
export const sysJobQueue = pgTable("sys_job_queue", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  queue: varchar("queue", { length: 50 }).default("default").notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(5).notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
