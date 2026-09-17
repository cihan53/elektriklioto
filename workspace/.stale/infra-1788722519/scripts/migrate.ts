
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || "postgres"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "elektriklioto"}`;

const sql = postgres(dbUrl, { max: 1 });

async function runMigrations() {
  console.log("--------------------------------------------------");
  console.log("elektriklioto.com - Veritabanı Şema Göçü Başlıyor");
  console.log(`Bağlantı Hedefi: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);
  console.log("--------------------------------------------------");

  try {
    // 1. Migration takip tablosunu oluştur
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const migrationsDir = path.join(__dirname, "..", "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("Uygulanacak migration dosyası bulunamadı.");
      await sql.end();
      return;
    }

    for (const file of files) {
      const existing = await sql`
        SELECT name FROM __drizzle_migrations WHERE name = ${file} LIMIT 1;
      `;

      if (existing.length > 0) {
        console.log(`[ATLANDI] ${file} (zaten uygulanmış)`);
        continue;
      }

      console.log(`[UYGULANIYOR] ${file} ...`);
      const filePath = path.join(migrationsDir, file);
      const fileContent = fs.readFileSync(filePath, "utf8");

      // Tek işlem (transaction) içinde migration işlet
      await sql.begin(async (tx) => {
        await tx.unsafe(fileContent);
        await tx`
          INSERT INTO __drizzle_migrations (name) VALUES (${file});
        `;
      });

      console.log(`[TAMAMLANDI] ${file} başarıyla uygulandı.`);
    }

    console.log("--------------------------------------------------");
    console.log("Tüm migration'lar başarıyla tamamlandı.");
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("Migration hatası meydana geldi:", error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

runMigrations();
