
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, closeDb } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  console.log('[MIGRATION] PostGIS veritabanı şema göçü başlatılıyor...');

  const migrationFilePath = path.join(__dirname, 'migrations', '0000_init.sql');
  const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');

  try {
    await sql.unsafe(migrationSql);
    console.log('[MIGRATION] Tablolar ve PostGIS spatial GIST indeksi başarıyla oluşturuldu.');
  } catch (error) {
    console.error('[MIGRATION] Şema göçü sırasında hata meydana geldi:', error);
    throw error;
  }
}

// Doğrudan çalıştırıldığında işlet
if (process.argv[1] === __filename) {
  runMigrations()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await closeDb();
      process.exit(1);
    });
}
