
import { createRequire } from 'module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { config } from '../config/env.js';
import * as schema from './schema/index.js';

const req = createRequire(import.meta.url);
let client: any = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!dbInstance) {
    if (!config.databaseUrl || config.databaseUrl.includes('localhost:5432')) {
      throw new Error('PostgreSQL bağlantısı yapılandırılmadı, in-memory mod devrede');
    }
    try {
      const postgres = req('postgres');
      const { drizzle } = req('drizzle-orm/postgres-js');
      client = postgres(config.databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      dbInstance = drizzle(client, { schema });
    } catch (err) {
      throw new Error('PostgreSQL başlatılamadı');
    }
  }
  return dbInstance!;
}

export { schema };

