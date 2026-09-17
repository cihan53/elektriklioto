
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

/**
 * /healthz  → süreç ayakta mı (bağımlılık kontrolü yok, orkestratör canlılık kontrolü için).
 * /readyz   → DB bağlantısı çalışıyor mu + en son uygulanan migration adı (node-pg-migrate'in
 *             varsayılan `pgmigrations` tablosundan) — trafiği almaya hazır mı sorusu içindir.
 */
export function registerHealthRoutes(app: FastifyInstance, pool: Pool): void {
  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/readyz', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');

      const migrationName = await pool
        .query('SELECT name FROM pgmigrations ORDER BY run_on DESC LIMIT 1')
        .then((result) => result.rows[0]?.name ?? null)
        .catch(() => null);

      return { status: 'ok', db: 'up', migration: migrationName };
    } catch {
      reply.code(503);
      return { status: 'error', db: 'down' };
    }
  });
}
