
#!/usr/bin/env node
'use strict';

/**
 * (zorunlu) KVKK / Konum Gizliliği kontrolü:
 * device, favorite ve fault_report tablolarında kullanıcıya bağlı hiçbir
 * geometry/geography/lat-lon sütunu olmamalıdır. Bu script bunu information_schema
 * üzerinden doğrular; ihlal varsa çıkış kodu 1 döner (CI kapısı olarak kullanılabilir).
 */

const { Client } = require('pg');

const GUARDED_TABLES = ['device', 'favorite', 'fault_report'];
const FORBIDDEN_NAME_PATTERN = /(geom|geography|lat|lon|latitude|longitude|coordinate)/i;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[privacy-guard] DATABASE_URL tanımlı değil, kontrol çalıştırılamıyor.');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const { rows } = await client.query(
      `SELECT table_name, column_name, udt_name
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [GUARDED_TABLES]
    );

    const violations = rows.filter((row) => {
      const isGeometryType = row.udt_name === 'geometry' || row.udt_name === 'geography';
      const suspiciousName = FORBIDDEN_NAME_PATTERN.test(row.column_name);
      return isGeometryType || suspiciousName;
    });

    if (violations.length > 0) {
      console.error('[privacy-guard] KVKK ihlali: kullanıcıya bağlı tabloda konum sütunu bulundu:');
      for (const v of violations) {
        console.error(`  - ${v.table_name}.${v.column_name} (${v.udt_name})`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('[privacy-guard] OK: device/favorite/fault_report tablolarında konum sütunu yok.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[privacy-guard] Kontrol çalışırken hata oluştu:', err);
  process.exitCode = 1;
});
