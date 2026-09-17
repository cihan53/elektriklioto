
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { loadConfig } from '@elektriklioto/config';
import { createDbPool } from '@elektriklioto/db';
import { registerHealthRoutes } from './routes/health';

async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // (zorunlu) KVKK: konum alanları log'a asla düz yazılmaz.
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            query: request.query,
          };
        },
      },
      redact: {
        paths: ['req.query.bbox', 'req.query.lat', 'req.query.lon', 'req.headers.authorization'],
        censor: '[redacted]',
      },
    },
  });

  const pool = createDbPool(config);

  await app.register(helmet);
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  });

  registerHealthRoutes(app, pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });

  try {
    const address = await app.listen({ host: config.API_HOST, port: config.API_PORT });
    app.log.info(`api dinlemede: ${address}`);
  } catch (err) {
    app.log.error(err, 'api başlatılamadı');
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] beklenmeyen hata:', err);
  process.exit(1);
});
