
import { pgTable, uuid, varchar, jsonb, integer, timestamp, text } from 'drizzle-orm/pg-core';

/**
 * PostgreSQL FOR UPDATE SKIP LOCKED Tabanlı Sistem İş Kuyruğu (sys_job_queue)
 * 
 * Redis / RabbitMQ bağımlılığı olmaksızın PostgreSQL ACID garantisiyle
 * asenkron arka plan işlerini yürütür.
 */
export const sysJobQueue = pgTable('sys_job_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending, processing, completed, failed
  attempts: integer('attempts').notNull().default(0),
  max_attempts: integer('max_attempts').notNull().default(3),
  run_at: timestamp('run_at').notNull().defaultNow(),
  locked_at: timestamp('locked_at'),
  locked_by: varchar('locked_by', { length: 100 }),
  last_error: text('last_error'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
