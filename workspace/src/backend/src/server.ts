
import { buildApp } from './app.js';
import { config } from './config/env.js';

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });
    console.log(`elektriklioto-api sunucusu http://${config.host}:${config.port} adresinde çalışıyor.`);
  } catch (err) {
    console.error('Sunucu başlatılırken hata oluştu:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
