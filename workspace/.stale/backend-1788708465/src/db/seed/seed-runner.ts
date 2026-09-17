
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, closeDb } from '../connection.js';
import { normalizeNFC, toSlug, generateStationSlug } from '../../utils/unicode-slug.js';
import { validateTurkeyCoordinates } from '../../utils/geo.js';
import { runMigrations } from '../migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawStationInput {
  istasyon_no?: string;
  istasyonNo?: string;
  id?: string | number;
  lat?: number | string;
  lon?: number | string;
  enlem?: number | string;
  boylam?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  name?: string;
  istasyon_adi?: string;
  istasyonAdi?: string;
  operator?: string;
  operator_adi?: string;
  operatorAdi?: string;
  marka?: string;
  address?: string;
  adres?: string;
  city?: string;
  il?: string;
  district?: string;
  ilce?: string;
  [key: string]: unknown;
}

function resolveSeedFilePath(): string | null {
  const candidatePaths = [
    process.env.SEED_FILE_PATH,
    path.resolve(process.cwd(), 'workspace/istasyonlar.json'),
    path.resolve(process.cwd(), '../../istasyonlar.json'),
    path.resolve(process.cwd(), '../istasyonlar.json'),
    path.resolve(process.cwd(), 'istasyonlar.json'),
    path.resolve(__dirname, 'istasyonlar.json'),
  ].filter(Boolean) as string[];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function generateFallbackFixtures(): RawStationInput[] {
  return [
    {
      istasyon_no: 'ŞRJ/00001',
      name: 'ZES Kadıköy Tepe Nautilus',
      operator: 'ZES',
      lat: 40.9995,
      lon: 29.0335,
      il: 'İstanbul',
      ilce: 'Kadıköy',
      adres: 'Acıbadem Mah. Fatih Sok. No:1 Kadıköy',
    },
    {
      istasyon_no: 'ŞRJ/00002',
      name: 'Trugo Bolu Highway Otoyol Dinlenme Tesisi',
      operator: 'Trugo',
      lat: 40.7551,
      lon: 31.4285,
      il: 'Bolu',
      ilce: 'Merkez',
      adres: 'TEM Otoyolu Bolu Dağı Geçişi',
    },
    {
      istasyon_no: 'ŞRJ/00003',
      name: 'Eşarj Ankara Armada AVM',
      operator: 'Eşarj',
      lat: 39.9135,
      lon: 32.8088,
      il: 'Ankara',
      ilce: 'Yenimahalle',
      adres: 'Eskişehir Yolu No:6 Söğütözü',
    },
    {
      istasyon_no: 'ŞRJ/00004',
      name: 'Voltrun İzmir Konak Pier',
      operator: 'Voltrun',
      lat: 38.4237,
      lon: 27.1325,
      il: 'İzmir',
      ilce: 'Konak',
      adres: 'Atatürk Caddesi No:19 Konak',
    },
    {
      istasyon_no: 'ŞRJ/99999', // Hatalı koordinat örneği (Türkiye sınırları dışı)
      name: 'Hatalı Koordinat Test İstasyonu',
      operator: 'TestMarka',
      lat: 55.1234,
      lon: 10.4321,
      il: 'Almanya',
      ilce: 'Bilinmeyen',
      adres: 'Sınır dışı test kaydı',
    },
  ];
}

export async function runSeed(): Promise<void> {
  console.log('[SEED] Tohumlama süreci başlatılıyor...');
  await runMigrations();

  const seedPath = resolveSeedFilePath();
  let rawList: RawStationInput[] = [];

  if (seedPath) {
    console.log(`[SEED] Kaynak dosya bulundu: ${seedPath}`);
    const content = fs.readFileSync(seedPath, 'utf8');
    const parsed = JSON.parse(content);
    rawList = Array.isArray(parsed) ? parsed : (parsed.stations || parsed.data || []);
  } else {
    console.log('[SEED] Harici istasyonlar.json bulunamadı; temsili tohumlama fikstürü yükleniyor.');
    rawList = generateFallbackFixtures();
  }

  console.log(`[SEED] Ayrıştırılacak toplam kayıt sayısı: ${rawList.length}`);

  let totalProcessed = 0;
  let totalSeeded = 0;
  let totalRejected = 0;
  const rejectionReasons: Record<string, number> = {};
  const operatorCache = new Map<string, number>();

  for (const raw of rawList) {
    totalProcessed++;

    const rawStationNo = raw.istasyon_no || raw.istasyonNo || (raw.id ? `ŞRJ/${raw.id}` : null);
    if (!rawStationNo) {
      totalRejected++;
      rejectionReasons['MISSING_ISTASYON_NO'] = (rejectionReasons['MISSING_ISTASYON_NO'] || 0) + 1;
      await sql`
        INSERT INTO seed_rejects (istasyon_no, raw_payload, rejection_reason)
        VALUES ('UNKNOWN', ${JSON.stringify(raw)}, 'MISSING_ISTASYON_NO')
      `;
      continue;
    }

    const istasyonNo = normalizeNFC(String(rawStationNo).trim());

    const rawLat = raw.lat ?? raw.enlem ?? raw.latitude;
    const rawLon = raw.lon ?? raw.boylam ?? raw.longitude;
    const lat = typeof rawLat === 'string' ? Number.parseFloat(rawLat) : Number(rawLat);
    const lon = typeof rawLon === 'string' ? Number.parseFloat(rawLon) : Number(rawLon);

    const coordValidation = validateTurkeyCoordinates(lat, lon);
    if (!coordValidation.valid) {
      totalRejected++;
      const reason = coordValidation.reason || 'INVALID_COORDINATES';
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;

      await sql`
        INSERT INTO seed_rejects (istasyon_no, raw_payload, rejection_reason)
        VALUES (${istasyonNo}, ${JSON.stringify(raw)}, ${reason})
      `;
      continue;
    }

    // Operatör sözlüğü normalizasyonu
    const rawOperator = raw.operator || raw.operator_adi || raw.operatorAdi || raw.marka || 'Bilinmeyen Operatör';
    const operatorName = normalizeNFC(String(rawOperator).trim());
    const operatorSlug = toSlug(operatorName);

    let operatorId = operatorCache.get(operatorSlug);
    if (!operatorId) {
      const existingOp = await sql`
        SELECT id FROM operators WHERE slug = ${operatorSlug} LIMIT 1
      `;

      if (existingOp.length > 0) {
        operatorId = existingOp[0].id;
      } else {
        const defaultDeepLink = {
          supported: ['zes', 'trugo', 'esarj'].includes(operatorSlug),
          scheme: `${operatorSlug}://`,
          clipboard_fallback: true,
        };

        const insertedOp = await sql`
          INSERT INTO operators (slug, name, deep_link_config)
          VALUES (${operatorSlug}, ${operatorName}, ${JSON.stringify(defaultDeepLink)})
          ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
          RETURNING id
        `;
        operatorId = insertedOp[0].id;
      }
      operatorCache.set(operatorSlug, operatorId);
    }

    // İstasyon normalizasyonu
    const rawName = raw.name || raw.istasyon_adi || raw.istasyonAdi || `${operatorName} Şarj Noktası`;
    const stationName = normalizeNFC(String(rawName).trim());
    const city = raw.city || raw.il ? normalizeNFC(String(raw.city || raw.il).trim()) : null;
    const district = raw.district || raw.ilce ? normalizeNFC(String(raw.district || raw.ilce).trim()) : null;
    const address = raw.address || raw.adres ? normalizeNFC(String(raw.address || raw.adres).trim()) : null;

    const stationSlug = generateStationSlug(operatorSlug, city, district, istasyonNo);

    // Idempotent UPSERT işlemi (istasyon_no üzerinde UNIQUE)
    await sql`
      INSERT INTO stations (
        istasyon_no,
        slug,
        operator_id,
        name,
        lat,
        lon,
        address,
        city,
        district,
        raw_metadata,
        geom,
        updated_at
      )
      VALUES (
        ${istasyonNo},
        ${stationSlug},
        ${operatorId},
        ${stationName},
        ${lat},
        ${lon},
        ${address},
        ${city},
        ${district},
        ${JSON.stringify(raw)},
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        NOW()
      )
      ON CONFLICT (istasyon_no) DO UPDATE SET
        slug = EXCLUDED.slug,
        operator_id = EXCLUDED.operator_id,
        name = EXCLUDED.name,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        district = EXCLUDED.district,
        raw_metadata = EXCLUDED.raw_metadata,
        geom = EXCLUDED.geom,
        updated_at = NOW()
    `;

    totalSeeded++;
  }

  console.log('\n===== TOHUMLAMA (SEED) RAPORU =====');
  console.log(`İşlenen Toplam Kayıt   : ${totalProcessed}`);
  console.log(`Başarıyla Eklenen/Günc : ${totalSeeded}`);
  console.log(`Reddedilen Kayıtlar    : ${totalRejected}`);
  console.log(`Kayıtlı Operatör Sayısı: ${operatorCache.size}`);
  if (Object.keys(rejectionReasons).length > 0) {
    console.log('Red Nedenleri Dağılımı:');
    for (const [reason, count] of Object.entries(rejectionReasons)) {
      console.log(`  - ${reason}: ${count}`);
    }
  }
  console.log('===================================\n');
}

if (process.argv[1] === __filename) {
  runSeed()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[SEED HATA]:', err);
      await closeDb();
      process.exit(1);
    });
}
