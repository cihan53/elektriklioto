/**
 * cPanel Phusion Passenger - Nuxt 3 Entry Point
 * elektriklioto.com Web Frontend
 */

const path = require('path');
const fs = require('fs');

// .env dosyasını yükle (varsa)
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    require('dotenv').config({ path: envPath });
  } catch (e) {
    // dotenv isteğe bağlıdır
  }
}

// cPanel Passenger PORT yönetimi
process.env.PORT = process.env.PORT || '3000';
process.env.HOST = process.env.HOST || '127.0.0.1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`[cPanel Nuxt] Başlatılıyor... PORT: ${process.env.PORT}, NODE_ENV: ${process.env.NODE_ENV}`);

// Nuxt Nitro Server ESM çıktısını yükle
const nitroServerPath = path.resolve(__dirname, 'workspace/src/frontend/.output/server/index.mjs');

if (!fs.existsSync(nitroServerPath)) {
  console.error(`[cPanel Nuxt Hata] Nuxt derleme çıktısı bulunamadı: ${nitroServerPath}`);
  console.error(`Lütfen önce "npm --prefix workspace/src/frontend run build" komutunu çalıştırınız.`);
  process.exit(1);
}

import(nitroServerPath)
  .then(() => {
    console.log('[cPanel Nuxt] Nuxt Nitro sunucusu başarıyla yüklendi.');
  })
  .catch((err) => {
    console.error('[cPanel Nuxt Hata] Nuxt sunucusu başlatılamadı:', err);
    process.exit(1);
  });
