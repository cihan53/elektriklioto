
import { Pool, type PoolConfig } from 'pg';
import type { AppConfig } from '@elektriklioto/config';

/**
 * Tüm süreçler (api, worker) veritabanı bağlantı havuzunu buradan alır.
 * Bağlantı dizesi yalnızca AppConfig üzerinden (yani ortam değişkeninden) gelir.
 */
export function createDbPool(config: AppConfig, overrides: Partial<PoolConfig> = {}): Pool {
  return new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    ...overrides,
  });
}
