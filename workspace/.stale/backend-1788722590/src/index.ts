
import { buildApp } from './app.js';
import { env } from './config/env.js';

async function startServer() {
  try {
    const app = await buildApp();
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    // Server başarıyla ayağa kalktı
    process.stdout.write(`[elektriklioto-api] Server çalışıyor: ${address}\n`);
    process.stdout.write(`[elektriklioto-api] Swagger UI: ${address}/documentation\n`);
  } catch (err) {
    process.stderr.write(`[elektriklioto-api] Başlatma hatası: ${String(err)}\n`);
    process.exit(1);
  }
}

startServer();
