
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const dbUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || "postgres"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "elektriklioto"}`;

const sql = postgres(dbUrl, { max: 1 });

async function verifyDatabase() {
  console.log("==================================================");
  console.log("elektriklioto.com - Veritabanı ve PostGIS Doğrulama");
  console.log("==================================================");

  let success = true;

  try {
    // 1. PostGIS Sürüm Denetimi
    const postgisVersion = await sql`SELECT PostGIS_Full_Version() as version;`;
    if (postgisVersion.length > 0) {
      console.log(`[BAŞARILI] PostGIS Eklentisi: ${postgisVersion[0].version}`);
    } else {
      console.error("[HATA] PostGIS eklentisi bulunamadı!");
      success = false;
    }

    // 2. Tablo Varlığı Denetimi
    const requiredTables = [
      "operator",
      "station",
      "connector",
      "station_report",
      "tariff_history",
      "seed_rejects",
      "sys_job_queue",
    ];

    for (const table of requiredTables) {
      const res = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${table};
      `;
      if (res.length > 0) {
        console.log(`[BAŞARILI] Tablo mevcut: ${table}`);
      } else {
        console.error(`[HATA] Gerekli tablo eksik: ${table}`);
        success = false;
      }
    }

    // 3. Spatial GIST İndeks Denetimi
    const indexRes = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'station' AND indexname = 'idx_station_geom';
    `;
    if (indexRes.length > 0 && indexRes[0].indexdef.includes("USING gist")) {
      console.log(`[BAŞARILI] Spatial GIST İndeksi mevcut: ${indexRes[0].indexname}`);
    } else {
      console.error("[HATA] 'idx_station_geom' GIST indeksi bulunamadı!");
      success = false;
    }

    // 4. Otomatik Geom Tetikleyici Denetimi
    const triggerRes = await sql`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'station' AND trigger_name = 'trg_station_geom';
    `;
    if (triggerRes.length > 0) {
      console.log(`[BAŞARILI] Geom tetikleyicisi mevcut: ${triggerRes[0].trigger_name}`);
    } else {
      console.error("[HATA] 'trg_station_geom' tetikleyicisi bulunamadı!");
      success = false;
    }

    // 5. Türkiye BBox Mekânsal Sorgu Doğrulaması (ST_MakeEnvelope)
    const bboxTest = await sql`
      SELECT ST_AsText(ST_MakeEnvelope(25.5, 35.5, 45.0, 42.5, 4326)) as envelope;
    `;
    if (bboxTest.length > 0) {
      console.log(`[BAŞARILI] Türkiye Sınır Kutusu (BBox) Mekânsal Testi: ${bboxTest[0].envelope}`);
    } else {
      console.error("[HATA] PostGIS ST_MakeEnvelope sorgusu çalıştırılamadı!");
      success = false;
    }

    // 6. KVKK Sıfır Konum Saklama Güvenlik Denetimi
    const reportColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'station_report';
    `;
    const columnNames = reportColumns.map((c) => c.column_name);
    const forbiddenColumns = ["user_lat", "user_lon", "geom", "latitude", "longitude", "ip_address"];
    const violations = forbiddenColumns.filter((col) => columnNames.includes(col));

    if (violations.length === 0) {
      console.log("[BAŞARILI] KVKK Sıfır Konum Saklama İlkesi Doğrulandı (station_report tablosunda konum veya IP sütunu yok).");
    } else {
      console.error(`[KRİTİK HATA] KVKK İhlali! Yasaklı sütunlar tespit edildi: ${violations.join(", ")}`);
      success = false;
    }

    console.log("==================================================");
    if (success) {
      console.log("SONUÇ: Tüm altyapı ve veritabanı kontrolleri BAŞARILI!");
      console.log("==================================================");
    } else {
      console.error("SONUÇ: Bir veya daha fazla doğrulama adımı BAŞARISIZ oldu!");
      console.log("==================================================");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Doğrulama sırasında bağlantı veya sorgu hatası:", err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

verifyDatabase();
