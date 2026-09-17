
import { pgTable, serial, varchar, integer, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { operators } from './operators.js';

/**
 * CPO Veri Kaynakları Sağlık ve Tazelik İzleme Tablosu (source_health)
 * 
 * Harici operatör uç noktalarının sağlık durumunu, Circuit Breaker
 * durumunu ve 24 saatlik tazelik rozeti metriklerini tutar.
 */
export const sourceHealth = pgTable('source_health', {
  id: serial('id').primaryKey(),
  operator_id: integer('operator_id').notNull().references(() => operators.id),
  source_name: varchar('source_name', { length: 100 }).notNull(),
  endpoint_url: varchar('endpoint_url', { length: 500 }).notNull(),
  circuit_state: varchar('circuit_state', { length: 20 }).notNull().default('CLOSED'), // CLOSED, OPEN, HALF_OPEN
  consecutive_failures: integer('consecutive_failures').notNull().default(0),
  last_successful_sync: timestamp('last_successful_sync'),
  last_attempt_at: timestamp('last_attempt_at'),
  last_error: text('last_error'),
  is_healthy: boolean('is_healthy').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
