/**
 * cPanel Phusion Passenger - Fastify API Entry Point
 * elektriklioto.com Backend API
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
process.env.PORT = process.env.PORT || '4000';
process.env.HOST = process.env.HOST || '127.0.0.1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`[cPanel API] Fastify API Başlatılıyor... PORT: ${process.env.PORT}, NODE_ENV: ${process.env.NODE_ENV}`);

// Fastify Backend dist/server.js çıktısını yükle
const apiServerPath = path.resolve(__dirname, 'workspace/src/backend/dist/server.js');

if (!fs.existsSync(apiServerPath)) {
  console.error(`[cPanel API Hata] Backend derleme çıktısı bulunamadı: ${apiServerPath}`);
  console.error(`Lütfen önce "npm --prefix workspace/src/backend run build" komutunu çalıştırınız.`);
  process.exit(1);
}

import(apiServerPath)
  .then(() => {
    console.log('[cPanel API] Fastify API sunucusu başarıyla yüklendi.');
  })
  .catch((err) => {
    console.error('[cPanel API Hata] Fastify sunucusu başlatılamadı:', err);
    process.exit(1);
  });
