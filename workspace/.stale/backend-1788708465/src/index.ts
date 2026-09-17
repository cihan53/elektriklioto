
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/connection.js';

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`[SYSTEM] ${signal} alındı; servis kapatılıyor...`);
    try {
      await app.close();
      await closeDb();
      process.exit(0);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`[HTTP] elektriklioto.com API http://${env.HOST}:${env.PORT} üzerinde yayında`);
    console.log(`[DOCS] OpenAPI Dokümantasyonu: http://${env.HOST}:${env.PORT}/documentation`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
