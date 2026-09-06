
import Fastify from 'fastify';
import { loadConfig } from '@elektriklioto/config';
import { createDbPool } from '@elektriklioto/db';

/**
 * Worker süreci apps/api'den bağımsız çalışır ve kendi /healthz portunu açar
 * (bkz. teknik_mimari_dokumani.md §10). Bu görevin kapsamı yalnızca altyapı
 * iskeletidir: gerçek connector/ingestion mantığı ayrı bir sprint görevinde
 * eklenecektir. Buradaki job_queue sorgusu yalnızca bağlantının ve
 * `FOR UPDATE SKIP LOCKED` deseninin çalıştığını doğrulayan bir yoklamadır.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  const pool = createDbPool(config);

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/readyz', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', db: 'up' };
    } catch {
      reply.code(503);
      return { status: 'error', db: 'down' };
    }
  });

  const POLL_INTERVAL_MS = 5_000;

  async function pollOnce(): Promise<void> {
    const { rows } = await pool.query(
      `SELECT id FROM job_queue
        WHERE status = 'pending' AND run_after <= now()
        ORDER BY id
        FOR UPDATE SKIP LOCKED
        LIMIT 1`
    );

    if (rows.length > 0) {
      app.log.info({ jobId: rows[0].id }, 'bekleyen iş bulundu (connector henüz eklenmedi)');
    }
  }

  const pollTimer = setInterval(() => {
    pollOnce().catch((err) => app.log.error(err, 'job_queue sorgusu başarısız'));
  }, POLL_INTERVAL_MS);

  app.addHook('onClose', async () => {
    clearInterval(pollTimer);
    await pool.end();
  });

  try {
    const address = await app.listen({ host: config.WORKER_HEALTH_HOST, port: config.WORKER_HEALTH_PORT });
    app.log.info(`worker healthz dinlemede: ${address}`);
  } catch (err) {
    app.log.error(err, 'worker başlatılamadı');
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[worker] beklenmeyen hata:', err);
  process.exit(1);
});
