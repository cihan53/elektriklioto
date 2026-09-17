
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';
import { env } from '../config/env.js';

let sqlClient: postgres.Sql | null = null;

export function getSqlClient(): postgres.Sql {
  if (!sqlClient) {
    sqlClient = postgres(env.DATABASE_URL, {
      max: env.DB_POOL_MAX,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {}, // Bildirim log kirliliğini engelle
    });
  }
  return sqlClient;
}

export const db = drizzle(getSqlClient(), { schema });

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = getSqlClient();
    await client`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}
