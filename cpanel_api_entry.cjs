/**
 * cPanel Phusion Passenger - Fastify API Entry Point
 * elektriklioto.com Backend API
 */

const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Root dizinde node_modules ve package.json sembolik bağını garanti et
const rootNodeModules = path.resolve(__dirname, 'node_modules');
const backendNodeModules = path.resolve(__dirname, 'workspace/src/backend/node_modules');
if (!fs.existsSync(rootNodeModules) && fs.existsSync(backendNodeModules)) {
  try {
    fs.symlinkSync('workspace/src/backend/node_modules', rootNodeModules, 'junction');
  } catch (e) {}
}

const rootPackageJson = path.resolve(__dirname, 'package.json');
const backendPackageJson = path.resolve(__dirname, 'workspace/src/backend/package.json');
if (!fs.existsSync(rootPackageJson) && fs.existsSync(backendPackageJson)) {
  try {
    fs.symlinkSync('workspace/src/backend/package.json', rootPackageJson);
  } catch (e) {}
}

// postgres paketi index.js uyumluluk yaması (Node legacyMainResolve hatasını engeller)
const postgresDir = path.resolve(__dirname, 'workspace/src/backend/node_modules/postgres');
if (fs.existsSync(postgresDir)) {
  const pgIndex = path.resolve(postgresDir, 'index.js');
  if (!fs.existsSync(pgIndex)) {
    try {
      fs.writeFileSync(pgIndex, "export * from './src/index.js';\nimport postgres from './src/index.js';\nexport default postgres;\n");
    } catch (e) {}
  }
}

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
process.env.NODE_PATH = [backendNodeModules, rootNodeModules].join(path.delimiter);

console.log(`[cPanel API] Fastify API Başlatılıyor... PORT: ${process.env.PORT}, NODE_ENV: ${process.env.NODE_ENV}`);

// Fastify Backend çıktısını yükle (Öncelikli olarak tek dosyalık CJS bundle, yoksa ESM dist)
const bundlePath = path.resolve(__dirname, 'workspace/src/backend/dist/server.bundle.cjs');
const apiServerPath = path.resolve(__dirname, 'workspace/src/backend/dist/server.js');

if (fs.existsSync(bundlePath)) {
  try {
    require(bundlePath);
    console.log('[cPanel API] Fastify API CJS bundle (tek dosya) başarıyla yüklendi.');
  } catch (err) {
    console.error('[cPanel API Hata] Fastify bundle başlatılamadı:', err);
    process.exit(1);
  }
} else if (fs.existsSync(apiServerPath)) {
  import(pathToFileURL(apiServerPath).href)
    .then(() => {
      console.log('[cPanel API] Fastify API sunucusu başarıyla yüklendi.');
    })
    .catch((err) => {
      console.error('[cPanel API Hata] Fastify sunucusu başlatılamadı:', err);
      process.exit(1);
    });
} else {
  console.error(`[cPanel API Hata] Backend derleme çıktısı bulunamadı: ${bundlePath} veya ${apiServerPath}`);
  console.error(`Lütfen önce "npm --prefix workspace/src/backend run build" komutunu çalıştırınız.`);
  process.exit(1);
}

