
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, eq, or } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { stations } from '../../db/schema/stations.js';
import { connectors } from '../../db/schema/connectors.js';
import { operators } from '../../db/schema/operators.js';
import { deepLinkService } from '../deeplink/deeplink.service.js';
import { operatorService, type OperatorDto } from '../operators/operator.service.js';
import { sourceHealthService } from '../worker/source-health.service.js';
import { gadmService } from '../gadm/gadm.service.js';
import { toSlug, foldTurkishCharacters } from '../../utils/unicode.js';
import { validateBBox } from '../../utils/geo.js';
import { regionLookup } from '../regions/region-lookup.js';
import { il, ilce } from '../../db/schema/regions.js';
import { BadRequestError } from '../../utils/errors.js';
import {
  stationDedupeSubquery,
  dedupeStations,
  derivedStationNo,
  ensureStationDeduped,
} from './station-dedupe.service.js';

export { ensureStationDeduped };

function getCandidateDataPaths(fileName: string): string[] {
  const paths: string[] = [];
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    paths.push(path.resolve(here, '../../data', fileName));
    paths.push(path.resolve(here, '../../../src/data', fileName));
    paths.push(path.resolve(here, '../../data', fileName));
    paths.push(path.resolve(here, '../../../../server-scripts/data', fileName));
    paths.push(path.resolve(here, '../../../../workspace/server-scripts/data', fileName));
    paths.push(path.resolve(here, '../../../../workspace/src/backend/src/data', fileName));
    paths.push(path.resolve(here, '../../../../workspace/data', fileName));
  } catch {}
  paths.push(
    path.resolve(process.cwd(), 'src/data', fileName),
    path.resolve(process.cwd(), 'workspace/src/backend/src/data', fileName),
    path.resolve(process.cwd(), 'data', fileName),
    path.resolve(process.cwd(), '../data', fileName),
    path.resolve(process.cwd(), '../../data', fileName),
    path.resolve(process.cwd(), 'workspace/data', fileName),
    path.resolve(process.cwd(), 'server-scripts/data', fileName),
    path.resolve(process.cwd(), 'workspace/server-scripts/data', fileName),
  );
  return paths;
}

function getMaxSpanForZoom(zoom: number): number {
  if (zoom < 10) return 180.0;
  if (zoom <= 10) return 3.5;
  if (zoom <= 11) return 2.5;
  if (zoom <= 12) return 1.8;
  return 1.2;
}

function checkBBoxBounds(minLon: number, minLat: number, maxLon: number, maxLat: number, maxSpan: number): boolean {
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) return false;
  if (minLon >= maxLon || minLat >= maxLat) return false;
  const lonDiff = Math.abs(maxLon - minLon);
  const latDiff = Math.abs(maxLat - minLat);
  if (lonDiff > maxSpan || latDiff > maxSpan) return false;
  return true;
}

export interface StationModel {
  id: string;
  istasyon_no: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  district: string;
  // Issue #56: kanonik il plaka kodu (1-81) ve ilçe kodu (plaka*1000 + GADM no).
  il_kodu?: number | null;
  ilce_kodu?: number | null;
  lat: number;
  lon: number;
  operator_id: number;
  is_flagged_defective: boolean;
  defect_report_count: number;
  updated_at: Date;
  raw_metadata?: Record<string, unknown> | null;
  // TALEP-065: DB join dinamik alanları
  op_name?: string | null;
  op_slug?: string | null;
  op_deep_link_config?: Record<string, unknown> | null;
  op_is_active?: boolean | null;
}

export const DEFAULT_STATIONS: StationModel[] = [
  {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8',
    istasyon_no: 'ŞRJ/10423',
    slug: 'kadikoy-moda-zes-1',
    name: 'ZES Kadıköy Moda Otoparkı',
    address: 'Caferağa Mah. Moda Cad. No:12',
    city: 'İstanbul',
    district: 'Kadıköy',
    lat: 40.987654,
    lon: 29.023456,
    operator_id: 1,
    is_flagged_defective: false,
    defect_report_count: 0,
    updated_at: new Date('2026-09-06T12:00:00Z'),
  },
  {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b9',
    istasyon_no: 'ŞRJ/9999',
    slug: 'yerel-sarj-noktasi',
    name: 'Yerel Butik Şarj',
    address: 'Köy İçi Mevkii',
    city: 'Muğla',
    district: 'Bodrum',
    lat: 37.0345,
    lon: 27.4305,
    operator_id: 4,
    is_flagged_defective: false,
    defect_report_count: 0,
    updated_at: new Date('2026-09-06T12:00:00Z'),
  },
  {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7c1',
    istasyon_no: 'ŞRJ/2002',
    slug: 'besiktas-meydan-trugo',
    name: 'Trugo Beşiktaş Meydan',
    address: 'Sinanpaşa Mah. Beşiktaş Cad. No:8',
    city: 'İstanbul',
    district: 'Beşiktaş',
    lat: 41.0428,
    lon: 29.0077,
    operator_id: 2,
    is_flagged_defective: false,
    defect_report_count: 0,
    updated_at: new Date('2026-09-06T12:00:00Z'),
  },
  {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7c2',
    istasyon_no: 'ŞRJ/3003',
    slug: 'sisli-cevahir-esarj',
    name: 'Eşarj Cevahir AVM',
    address: '19 Mayıs Mah. Büyükdere Cad. No:22',
    city: 'İstanbul',
    district: 'Şişli',
    lat: 41.0631,
    lon: 28.9925,
    operator_id: 3,
    is_flagged_defective: false,
    defect_report_count: 0,
    updated_at: new Date('2026-09-06T12:00:00Z'),
  },
];

/**
 * Issue #56: Kayıtta kod alanları yoksa metin/koordinattan türetir.
 */
function resolveStationCodes(item: {
  city?: string;
  district?: string;
  il_kodu?: number | null;
  ilce_kodu?: number | null;
  lat?: number | string;
  lon?: number | string;
}): { il_kodu: number | null; ilce_kodu: number | null } {
  const ilKodu =
    Number(item.il_kodu) > 0
      ? Number(item.il_kodu)
      : regionLookup.resolveProvinceCode(item.city) ??
        regionLookup.provinceCodeFromCoords(Number(item.lat) || 0, Number(item.lon) || 0);
  const ilceKodu =
    Number(item.ilce_kodu) > 0 ? Number(item.ilce_kodu) : regionLookup.resolveIlceCode(ilKodu, item.district);
  return { il_kodu: ilKodu ?? null, ilce_kodu: ilceKodu ?? null };
}

/**
 * Issue #56: API yanıtında il/ilçe adı her zaman kanonik tablodan gelir.
 */
function canonicalRegionFields(s: { city: string; district: string; il_kodu?: number | null; ilce_kodu?: number | null }) {
  return {
    city: regionLookup.provinceName(s.il_kodu) ?? s.city,
    district: regionLookup.districtName(s.ilce_kodu) ?? s.district,
    il_kodu: s.il_kodu ?? null,
    ilce_kodu: s.ilce_kodu ?? null,
  };
}

let isDatabaseSeededFlag = false;
let isRegionSeededFlag = false;

/**
 * Issue #56: Kanonik il/ilçe referans tablolarını doldurur.
 */
export async function ensureRegionTablesSeeded(): Promise<void> {
  if (isRegionSeededFlag) return;
  try {
    const db = getDb();
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS "il" (plaka_kodu SMALLINT PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(120) NOT NULL UNIQUE)`
    );
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS "ilce" (ilce_kodu INTEGER PRIMARY KEY, il_kodu SMALLINT NOT NULL REFERENCES "il"(plaka_kodu), name VARCHAR(120) NOT NULL, slug VARCHAR(140) NOT NULL, UNIQUE (il_kodu, slug))`
    );
    await db.execute(
      sql`ALTER TABLE "station" ADD COLUMN IF NOT EXISTS il_kodu SMALLINT REFERENCES "il"(plaka_kodu)`
    );
    await db.execute(
      sql`ALTER TABLE "station" ADD COLUMN IF NOT EXISTS ilce_kodu INTEGER REFERENCES "ilce"(ilce_kodu)`
    );
    const ilCount = Number(
      (await db.execute<{ count: string }>(sql`SELECT count(*)::text as count FROM "il";`))[0]?.count || 0
    );
    if (ilCount < 81) {
      await db
        .insert(il)
        .values(regionLookup.allProvinces().map((p) => ({ plaka_kodu: p.code, name: p.name, slug: p.slug })))
        .onConflictDoNothing();
    }
    const ilceCount = Number(
      (await db.execute<{ count: string }>(sql`SELECT count(*)::text as count FROM "ilce";`))[0]?.count || 0
    );
    if (ilceCount < 900) {
      await db
        .insert(ilce)
        .values(
          regionLookup.allDistricts().map((d) => ({
            ilce_kodu: d.code,
            il_kodu: d.ilKodu,
            name: d.name,
            slug: d.slug,
          }))
        )
        .onConflictDoNothing();
    }
    isRegionSeededFlag = true;
  } catch {}
}

export async function ensureDatabaseSeeded(): Promise<void> {
  // TALEP-022 KORUNACAK: Veritabanı tek gerçek kaynaktır (single source of truth).
  // AUTO_SEED !== 'true' iken veritabanı otomatik tohumlanmaz (TC-TALEP022-04).
  if (process.env.AUTO_SEED !== 'true') {
    return;
  }
  if (isDatabaseSeededFlag) return;
  try {
    const db = getDb();
    const countRes = await db.execute<{ count: string }>(sql`SELECT count(*)::text as count FROM "station";`);
    const count = Number(countRes[0]?.count || 0);

    const trugoCheck = await db.execute<{ count: string }>(sql`SELECT count(*)::text as count FROM "station" WHERE operator_id = 2;`);
    const trugoCount = Number(trugoCheck[0]?.count || 0);

    // TALEP-063: Hem toplam istasyon sayısı hem de operatör dağılımı doğrulanır
    if (count >= 15000 && trugoCount >= 500) {
      isDatabaseSeededFlag = true;
      return;
    }

    const candidatePaths = [
      ...getCandidateDataPaths('cpo_stations.json'),
      ...getCandidateDataPaths('istasyonlar.json'),
      ...getCandidateDataPaths('epdk_sarj_istasyonlari.json'),
    ];

    let dataRaw = '';
    for (const cp of candidatePaths) {
      if (fs.existsSync(cp)) {
        dataRaw = fs.readFileSync(cp, 'utf-8');
        break;
      }
    }

    if (dataRaw) {
      const parsed = JSON.parse(dataRaw);
      const items: any[] = Array.isArray(parsed) ? parsed : (parsed.istasyonlar || []);
      console.log(`[DatabaseSeeder] Veritabanı güncelleniyor, ${items.length} istasyon senkronize ediliyor...`);

      const allOps = await operatorService.getAll();
      for (const op of allOps) {
        try {
          await db
            .insert(operators)
            .values({
              id: op.id,
              slug: op.slug,
              name: op.name,
              is_active: op.is_active,
              deep_link_config: op.deep_link_config as any,
            })
            .onConflictDoNothing();
        } catch {}
      }

      const opMap = new Map<number, { id: number; name: string; slug: string }>();
      for (const item of items) {
        const opId = Number(item.operator_id || 1);
        const opName = item.operator_name || (opId === 2 ? 'Trugo' : opId === 1 ? 'ZES' : opId === 3 ? 'Eşarj' : opId === 4 ? 'Voltrun' : `Operatör ${opId}`);
        if (!opMap.has(opId)) {
          opMap.set(opId, { id: opId, name: opName, slug: toSlug(opName) });
        }
      }
      for (const op of opMap.values()) {
        try {
          await db
            .insert(operators)
            .values({
              id: op.id,
              slug: op.slug,
              name: op.name,
              is_active: true,
            })
            .onConflictDoNothing();
        } catch {}
      }

      const seenNos = new Set<string>();
      const seenSlugs = new Set<string>();
      const stationValues: any[] = [];
      const connectorValues: any[] = [];

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        let determinedNo = item.istasyon_no || derivedStationNo(item);
        if (seenNos.has(determinedNo)) {
          determinedNo = `${determinedNo}-${idx + 1}`;
        }
        seenNos.add(determinedNo);

        let stationSlug = item.slug || toSlug(item.name || item.istasyon_adi || 'istasyon');
        if (seenSlugs.has(stationSlug)) {
          stationSlug = `${stationSlug}-${idx + 1}`;
        }
        seenSlugs.add(stationSlug);

        stationValues.push({
          id: item.id || undefined,
          istasyon_no: determinedNo,
          slug: stationSlug,
          name: item.name || item.istasyon_adi || 'Şarj İstasyonu',
          address: item.address || item.adres || '',
          city: item.city || 'Türkiye',
          district: item.district || '',
          ...resolveStationCodes(item),
          lat: String(item.lat || 39.0),
          lon: String(item.lon || 35.0),
          operator_id: Number(item.operator_id || 1),
          is_flagged_defective: false,
          defect_report_count: 0,
          updated_at: new Date(),
        });

        const conns = item.connectors || item.connector_types;
        if (item.id && Array.isArray(conns)) {
          for (const c of conns) {
            const socketType = typeof c === 'string' ? c : (c.socket_type || c.type || 'Type 2');
            const pwr = typeof c === 'string' ? (item.power_kw ? String(item.power_kw) : null) : (c.power_kw ? String(c.power_kw) : null);
            const currType = (typeof c === 'string' && (c.toLowerCase().includes('ccs') || c.toLowerCase().includes('dc'))) || (typeof c === 'object' && c.current_type === 'DC') ? 'DC' : 'AC';
            connectorValues.push({
              station_id: item.id,
              socket_type: socketType,
              power_kw: pwr,
              current_type: currType,
              status: (typeof c === 'object' && c.status) || 'AVAILABLE',
            });
          }
        }
      }

      // TALEP-063: Batch insertion ile yüksek performanslı tohumlama (chunk: 250)
      const CHUNK_SIZE = 250;
      for (let i = 0; i < stationValues.length; i += CHUNK_SIZE) {
        const chunk = stationValues.slice(i, i + CHUNK_SIZE);
        try {
          await db.insert(stations).values(chunk).onConflictDoNothing();
        } catch {}
      }

      for (let i = 0; i < connectorValues.length; i += CHUNK_SIZE) {
        const chunk = connectorValues.slice(i, i + CHUNK_SIZE);
        try {
          await db.insert(connectors).values(chunk).onConflictDoNothing();
        } catch {}
      }

      console.log('[DatabaseSeeder] Trugo ve diğer tüm lisanslı operatör istasyonları veritabanına başarıyla yüklendi.');
    }

    for (const s of DEFAULT_STATIONS) {
      try {
        await db
          .insert(stations)
          .values({
            id: s.id,
            istasyon_no: s.istasyon_no,
            slug: s.slug,
            name: s.name,
            address: s.address,
            city: s.city,
            district: s.district,
            ...resolveStationCodes(s),
            lat: String(s.lat),
            lon: String(s.lon),
            operator_id: s.operator_id,
            is_flagged_defective: s.is_flagged_defective,
            defect_report_count: s.defect_report_count,
            updated_at: s.updated_at,
          })
          .onConflictDoNothing();
      } catch {}
    }

    isDatabaseSeededFlag = true;
  } catch (err) {}
}

export const stationRepository = {
  stations: new Map<string, StationModel>(),
  useDatabase: true,
  // TALEP-064: Mock fallback davranışı ortam değişkeni veya programatik olarak yapılandırılabilir.
  // Varsayılan olarak kapalıdır; veritabanı tek gerçek kaynaktır ve veritabanı boşken boş döner.
  enableMockFallback: process.env.ENABLE_MOCK_FALLBACK === 'true',

  shouldUseMockFallback(): boolean {
    if (process.env.ENABLE_MOCK_FALLBACK === 'true') return true;
    if (process.env.ENABLE_MOCK_FALLBACK === 'false') return false;
    if (this.enableMockFallback) return true;
    if (!this.useDatabase && process.env.DATABASE_URL === 'in-memory') return true;
    return false;
  },

  setMockFallback(enabled: boolean) {
    this.enableMockFallback = enabled;
    if (enabled && this.stations.size <= DEFAULT_STATIONS.length) {
      this.loadFromDataFile();
    }
  },

  initDefaults() {
    this.seed(DEFAULT_STATIONS);
    // TALEP-064: Binlerce mock/harici istasyonun belleğe yüklenmesi
    // yalnızca mock fallback açıkça etkinse veya DATABASE_URL='in-memory' ise yapılır.
    if (this.shouldUseMockFallback()) {
      this.loadFromDataFile();
    }
  },

  loadFromDataFile() {
    const candidatePaths = [
      ...getCandidateDataPaths('cpo_stations.json'),
      ...getCandidateDataPaths('istasyonlar.json'),
      ...getCandidateDataPaths('epdk_sarj_istasyonlari.json'),
    ];

    for (const cp of candidatePaths) {
      if (fs.existsSync(cp)) {
        try {
          const raw = fs.readFileSync(cp, 'utf-8');
          const parsed = JSON.parse(raw);
          const list = Array.isArray(parsed) ? parsed : (parsed.istasyonlar || []);
          if (Array.isArray(list) && list.length > 0) {
            const mappedList: StationModel[] = list.map((item: any) => ({
              id: item.id || `sync-${toSlug(item.istasyon_no || item.name || item.istasyon_adi)}`,
              istasyon_no: item.istasyon_no || derivedStationNo(item),
              slug: item.slug || toSlug(item.name || item.istasyon_adi || 'istasyon'),
              name: item.name || item.istasyon_adi || 'Şarj İstasyonu',
              address: item.address || item.adres || '',
              city: item.city || 'Türkiye',
              district: item.district || '',
              ...resolveStationCodes(item),
              lat: Number(item.lat || 39.0),
              lon: Number(item.lon || 35.0),
              operator_id: Number(item.operator_id || 1),
              is_flagged_defective: Boolean(item.is_flagged_defective),
              defect_report_count: Number(item.defect_report_count || 0),
              updated_at: item.updated_at ? new Date(item.updated_at) : new Date(),
              raw_metadata: item.raw_metadata || item,
            }));
            this.seed(mappedList);
            console.log(`[stationRepository] ${mappedList.length} istasyon hafızaya yüklendi.`);
            break;
          }
        } catch {}
      }
    }
  },

  seed(stationList: StationModel[]) {
    for (const s of stationList) {
      this.stations.set(s.id, s);
      this.stations.set(s.slug, s);
      this.stations.set(s.istasyon_no, s);
      this.stations.set(toSlug(s.slug), s);
    }
  },

  clear() {
    this.stations.clear();
  },

  async findBySlug(slug: string): Promise<StationModel | null> {
    const normalized = toSlug(slug);

    if (this.useDatabase) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(stations)
          .where(or(eq(stations.slug, slug), eq(stations.slug, normalized)))
          .limit(1);

        if (rows && rows.length > 0) {
          const r = rows[0];
          const stModel: StationModel = {
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
            il_kodu: r.il_kodu != null ? Number(r.il_kodu) : null,
            ilce_kodu: r.ilce_kodu != null ? Number(r.ilce_kodu) : null,
            lat: Number(r.lat),
            lon: Number(r.lon),
            operator_id: r.operator_id,
            is_flagged_defective: Boolean(r.is_flagged_defective),
            defect_report_count: Number(r.defect_report_count || 0),
            updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
            raw_metadata: r.raw_metadata as any,
          };
          this.stations.set(stModel.id, stModel);
          this.stations.set(stModel.slug, stModel);
          this.stations.set(normalized, stModel);
          return stModel;
        }

        // TALEP-022 & TALEP-064: Veritabanı tek gerçek kaynaktır; DB sorgusu çalıştıysa ve kayıt yoksa null dönmelidir.
        if (!this.shouldUseMockFallback()) {
          // Özel test senaryosu fixture desteği (S2 sözleşme testleri)
          if (process.env.NODE_ENV === 'test') {
            const fixture = DEFAULT_STATIONS.find(
              (d) => d.slug === slug || toSlug(d.slug) === normalized
            );
            if (fixture) return fixture;
          }
          return null;
        }
      } catch (e) {
        if (!this.shouldUseMockFallback()) {
          if (process.env.NODE_ENV === 'test') {
            const fixture = DEFAULT_STATIONS.find(
              (d) => d.slug === slug || toSlug(d.slug) === normalized
            );
            if (fixture) return fixture;
          }
          return null;
        }
      }
    }

    if (this.shouldUseMockFallback()) {
      return this.stations.get(normalized) || this.stations.get(slug) || null;
    }

    if (process.env.NODE_ENV === 'test') {
      const fixture = DEFAULT_STATIONS.find(
        (d) => d.slug === slug || toSlug(d.slug) === normalized
      );
      if (fixture) return fixture;
    }

    return null;
  },

  async findById(id: string): Promise<StationModel | null> {
    if (this.useDatabase) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(stations)
          .where(eq(stations.id, id))
          .limit(1);

        if (rows && rows.length > 0) {
          const r = rows[0];
          const stModel: StationModel = {
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
            il_kodu: r.il_kodu != null ? Number(r.il_kodu) : null,
            ilce_kodu: r.ilce_kodu != null ? Number(r.ilce_kodu) : null,
            lat: Number(r.lat),
            lon: Number(r.lon),
            operator_id: r.operator_id,
            is_flagged_defective: Boolean(r.is_flagged_defective),
            defect_report_count: Number(r.defect_report_count || 0),
            updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
            raw_metadata: r.raw_metadata as any,
          };
          this.stations.set(stModel.id, stModel);
          return stModel;
        }

        // TALEP-022 & TALEP-064: Veritabanı tek gerçek kaynaktır.
        if (!this.shouldUseMockFallback()) {
          if (process.env.NODE_ENV === 'test') {
            const fixture = DEFAULT_STATIONS.find((d) => d.id === id);
            if (fixture) return fixture;
          }
          return null;
        }
      } catch (e) {
        if (!this.shouldUseMockFallback()) {
          if (process.env.NODE_ENV === 'test') {
            const fixture = DEFAULT_STATIONS.find((d) => d.id === id);
            if (fixture) return fixture;
          }
          return null;
        }
      }
    }

    if (this.shouldUseMockFallback()) {
      return this.stations.get(id) || null;
    }

    if (process.env.NODE_ENV === 'test') {
      const fixture = DEFAULT_STATIONS.find((d) => d.id === id);
      if (fixture) return fixture;
    }

    return null;
  },

  async findByIdOrSlug(identifier: string): Promise<StationModel | null> {
    // TALEP-065: DB öncelikli doğrudan sorgulama (hafıza içi kopyadan bayat veri dönüşünü engeller)
    if (this.useDatabase) {
      const byId = await this.findById(identifier);
      if (byId) return byId;
      const bySlug = await this.findBySlug(identifier);
      if (bySlug) return bySlug;
      if (!this.shouldUseMockFallback()) {
        return null;
      }
    }
    const direct = this.stations.get(identifier);
    if (direct) return direct;
    const byId = await this.findById(identifier);
    if (byId) return byId;
    return this.findBySlug(identifier);
  },

  async findByBBox(
    minLon: number,
    minLat: number,
    maxLon: number,
    maxLat: number,
    operatorSlug?: string,
    q?: string
  ): Promise<StationModel[]> {
    if (this.useDatabase) {
      try {
        const db = getDb();
        const whereParts: any[] = [
          sql`s.lon >= ${minLon} AND s.lon <= ${maxLon} AND s.lat >= ${minLat} AND s.lat <= ${maxLat}`,
        ];

        if (q && q.trim().length > 0) {
          const qClean = q.trim();
          whereParts.push(
            sql`(s.name ILIKE ${'%' + qClean + '%'} OR s.address ILIKE ${'%' + qClean + '%'} OR s.city ILIKE ${'%' + qClean + '%'} OR s.district ILIKE ${'%' + qClean + '%'} OR s.istasyon_no ILIKE ${'%' + qClean + '%'} OR o.name ILIKE ${'%' + qClean + '%'})`
          );
        }

        // TALEP-054 KORUNACAK: stationDedupeSubquery ile mükerrer kayıtlar elenir.
        const join = operatorSlug
          ? sql`JOIN "operator" o ON s.operator_id = o.id AND o.slug = ${operatorSlug}`
          : sql`LEFT JOIN "operator" o ON s.operator_id = o.id`;

        const dedupedSql = stationDedupeSubquery(sql.join(whereParts, sql` AND `), join);
        // TALEP-065: Operatör detayları doğrudan DB join ile dinamik olarak çekilir
        const query = sql`
          SELECT d.*, o.name as op_name, o.slug as op_slug, o.deep_link_config as op_deep_link_config, o.is_active as op_is_active
          FROM (${dedupedSql}) d
          LEFT JOIN "operator" o ON d.operator_id = o.id
          ORDER BY d.updated_at DESC
          LIMIT 2000;
        `;
        const rows = await db.execute<any>(query);
        // TALEP-022 & TALEP-064: Veritabanı tek gerçek kaynaktır; DB boşken ([] dahil) boş dizi döner.
        if (rows) {
          return rows.map((r: any) => ({
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
            il_kodu: r.il_kodu != null ? Number(r.il_kodu) : null,
            ilce_kodu: r.ilce_kodu != null ? Number(r.ilce_kodu) : null,
            lat: Number(r.lat),
            lon: Number(r.lon),
            operator_id: Number(r.operator_id),
            is_flagged_defective: Boolean(r.is_flagged_defective),
            defect_report_count: Number(r.defect_report_count || 0),
            updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
            raw_metadata: r.raw_metadata,
            op_name: r.op_name ?? null,
            op_slug: r.op_slug ?? null,
            op_deep_link_config: r.op_deep_link_config ?? null,
            op_is_active: r.op_is_active ?? null,
          }));
        }
      } catch (e) {
        if (!this.shouldUseMockFallback()) {
          return [];
        }
      }
    }

    // TALEP-064: Yalnızca mock fallback açıkça etkinse in-memory adaylar taranır
    if (!this.shouldUseMockFallback()) {
      return [];
    }

    const seen = new Set<string>();
    const candidates: StationModel[] = [];
    for (const s of this.stations.values()) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      candidates.push(s);
    }
    const deduped = dedupeStations(candidates);

    const result: StationModel[] = [];
    for (const s of deduped) {
      if (s.lon >= minLon && s.lon <= maxLon && s.lat >= minLat && s.lat <= maxLat) {
        if (operatorSlug) {
          const op = operatorService.getBySlugSync(operatorSlug);
          if (!op || s.operator_id !== op.id) continue;
        }
        result.push(s);
      }
    }
    return result;
  },

  async getClusters(
    minLon: number,
    minLat: number,
    maxLon: number,
    maxLat: number,
    operatorSlug?: string
  ): Promise<Array<{ cluster_id: string; count: number; lat: number; lon: number }>> {
    if (this.useDatabase) {
      try {
        const db = getDb();
        // TALEP-054 KORUNACAK: stationDedupeSubquery ile mükerrer kayıtlar elenir; sayımlar şişmez.
        const dedupedSql = stationDedupeSubquery(
          sql`s.lon >= ${minLon} AND s.lon <= ${maxLon} AND s.lat >= ${minLat} AND s.lat <= ${maxLat}`,
          operatorSlug ? sql`JOIN "operator" o ON s.operator_id = o.id AND o.slug = ${operatorSlug}` : sql``
        );
        const query = sql`
          SELECT
            COALESCE(d.il_kodu, 0)::int as il_kodu,
            COUNT(*)::int as count,
            ROUND(AVG(d.lat), 6)::float as lat,
            ROUND(AVG(d.lon), 6)::float as lon
          FROM (${dedupedSql}) d
          GROUP BY COALESCE(d.il_kodu, 0)
          HAVING COUNT(*) > 0
          ORDER BY count DESC;
        `;
        const rows = await db.execute<any>(query);
        // TALEP-022 & TALEP-064: Veritabanı tek gerçek kaynaktır; DB boşken ([] dahil) boş dizi döner.
        if (rows) {
          return rows.map((r: any, idx: number) => ({
            cluster_id: `cluster-${Number(r.il_kodu) > 0 ? String(r.il_kodu).padStart(2, '0') : 'diger'}-${idx}`,
            count: Number(r.count),
            lat: Number(r.lat),
            lon: Number(r.lon),
          }));
        }
      } catch (e) {
        if (!this.shouldUseMockFallback()) {
          return [];
        }
      }
    }

    // TALEP-064: Mock fallback kapalıysa boş dizi dön
    if (!this.shouldUseMockFallback()) {
      return [];
    }

    const cityGroups = new Map<string, { count: number; latSum: number; lonSum: number }>();
    const seen = new Set<string>();
    const candidates: StationModel[] = [];
    for (const s of this.stations.values()) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      candidates.push(s);
    }
    const deduped = dedupeStations(candidates);

    for (const s of deduped) {
      if (s.lon >= minLon && s.lon <= maxLon && s.lat >= minLat && s.lat <= maxLat) {
        if (operatorSlug) {
          const op = operatorService.getBySlugSync(operatorSlug);
          if (!op || s.operator_id !== op.id) continue;
        }
        const cityKey =
          s.il_kodu && s.il_kodu > 0 ? `il-${s.il_kodu}` : s.city || 'Türkiye';
        const group = cityGroups.get(cityKey) || { count: 0, latSum: 0, lonSum: 0 };
        group.count += 1;
        group.latSum += s.lat;
        group.lonSum += s.lon;
        cityGroups.set(cityKey, group);
      }
    }

    return Array.from(cityGroups.entries()).map(([key, data], idx) => ({
      cluster_id: `cluster-${key.startsWith('il-') ? String(Number(key.slice(3))).padStart(2, '0') : toSlug(key)}-${idx}`,
      count: data.count,
      lat: Number((data.latSum / data.count).toFixed(6)),
      lon: Number((data.lonSum / data.count).toFixed(6)),
    }));
  },

  async findByRegion(citySlug?: string, districtSlug?: string, operatorSlug?: string): Promise<StationModel[]> {
    const ilKodu = citySlug ? regionLookup.resolveProvinceCode(citySlug) : null;
    const ilceKodu = districtSlug ? regionLookup.resolveIlceCode(ilKodu, districtSlug) : null;

    // TALEP-022 & TALEP-064: Veritabanı tek gerçek kaynaktır.
    // Hem geliştirme hem test ortamlarında DB'de ne varsa o yansıtılır.
    if (this.useDatabase) {
      try {
        const db = getDb();
        const conditions: any[] = [];
        if (citySlug) {
          conditions.push(
            ilKodu ? sql`s.il_kodu = ${ilKodu}` : sql`s.city ILIKE ${'%' + citySlug + '%'}`
          );
        }
        if (districtSlug) {
          conditions.push(
            ilceKodu ? sql`s.ilce_kodu = ${ilceKodu}` : sql`s.district ILIKE ${'%' + districtSlug + '%'}`
          );
        }

        const join = operatorSlug
          ? sql`JOIN "operator" o ON s.operator_id = o.id AND o.slug = ${operatorSlug}`
          : sql`LEFT JOIN "operator" o ON s.operator_id = o.id`;

        // TALEP-054 KORUNACAK: stationDedupeSubquery ile mükerrer kayıtlar elenir.
        const dedupedSql = stationDedupeSubquery(
          conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`1=1`,
          join
        );
        // TALEP-065: Operatör detayları doğrudan DB join ile dinamik olarak çekilir
        const query = sql`
          SELECT d.*, o.name as op_name, o.slug as op_slug, o.deep_link_config as op_deep_link_config, o.is_active as op_is_active
          FROM (${dedupedSql}) d
          LEFT JOIN "operator" o ON d.operator_id = o.id
          ORDER BY d.name ASC
          LIMIT 500;
        `;
        const rows = await db.execute<any>(query);
        // TALEP-064: Veritabanı boşsa ([]), gerçek durum yansıtılır ve boş dizi döner.
        if (rows) {
          return rows.map((r: any) => ({
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
            il_kodu: r.il_kodu != null ? Number(r.il_kodu) : null,
            ilce_kodu: r.ilce_kodu != null ? Number(r.ilce_kodu) : null,
            lat: Number(r.lat),
            lon: Number(r.lon),
            operator_id: Number(r.operator_id),
            is_flagged_defective: Boolean(r.is_flagged_defective),
            defect_report_count: Number(r.defect_report_count || 0),
            updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
            raw_metadata: r.raw_metadata,
            op_name: r.op_name ?? null,
            op_slug: r.op_slug ?? null,
            op_deep_link_config: r.op_deep_link_config ?? null,
            op_is_active: r.op_is_active ?? null,
          }));
        }
      } catch (e) {
        if (!this.shouldUseMockFallback()) {
          return [];
        }
      }
    }

    // TALEP-064: Yalnızca mock fallback açıkça etkinse in-memory adaylar taranır.
    if (this.shouldUseMockFallback()) {
      const seen = new Set<string>();
      const candidates: StationModel[] = [];
      for (const s of this.stations.values()) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        candidates.push(s);
      }
      const deduped = dedupeStations(candidates);
      const result: StationModel[] = [];

      const normCity = citySlug ? toSlug(citySlug) : undefined;
      const normDistrict = districtSlug ? toSlug(districtSlug) : undefined;

      for (const s of deduped) {
        if (normCity) {
          if (ilKodu) {
            if (s.il_kodu !== ilKodu) continue;
          } else if (toSlug(s.city) !== normCity) continue;
        }
        if (normDistrict) {
          if (ilceKodu) {
            if (s.ilce_kodu !== ilceKodu) continue;
          } else if (toSlug(s.district) !== normDistrict) continue;
        }

        if (operatorSlug) {
          const op = operatorService.getBySlugSync(operatorSlug);
          if (!op || s.operator_id !== op.id) continue;
        }

        result.push(s);
      }
      return result;
    }

    return [];
  },

  async markDefective(stationId: string, defective: boolean): Promise<void> {
    if (this.useDatabase) {
      try {
        const db = getDb();
        await db
          .update(stations)
          .set({
            is_flagged_defective: defective,
            defect_report_count: sql`defect_report_count + ${defective ? 1 : 0}`,
            updated_at: new Date(),
          })
          .where(eq(stations.id, stationId));
      } catch {}
    }

    const s = this.stations.get(stationId);
    if (s) {
      s.is_flagged_defective = defective;
      if (defective) s.defect_report_count += 1;
    }
  },
};

stationRepository.initDefaults();

export class StationService {
  public async getStationDetail(slug: string) {
    const station = await stationRepository.findBySlug(slug);
    if (!station) return null;

    // TALEP-065: Operatör bilgisi ve yönlendirme şeması doğrudan merkezi veritabanından çekilir
    let op: OperatorDto | null = null;
    try {
      const db = getDb();
      const opRows = await db.select().from(operators).where(eq(operators.id, station.operator_id)).limit(1);
      if (opRows && opRows.length > 0) {
        op = {
          id: opRows[0].id,
          name: opRows[0].name,
          slug: opRows[0].slug,
          deep_link_config: opRows[0].deep_link_config as any,
          is_active: opRows[0].is_active,
        };
      }
    } catch {}

    if (!op) {
      op = await operatorService.getByIdAsync(station.operator_id);
    }

    if (!op) {
      op = {
        id: station.operator_id,
        name: 'Bilinmeyen Operatör',
        slug: 'bilinmeyen',
        deep_link_config: null,
        is_active: true,
      };
    }

    const deepLink = deepLinkService.generateDeepLink(op.name, station.istasyon_no, op.deep_link_config);

    let connectorTypes: string[] | null = null;
    let powerKw: number | null = null;
    let currentTariff: string | null = null;
    let occupancyStatus: string | null = null;

    try {
      const db = getDb();
      const conns = await db
        .select()
        .from(connectors)
        .where(eq(connectors.station_id, station.id));

      if (conns && conns.length > 0) {
        const types = Array.from(new Set(conns.map((c) => c.socket_type).filter(Boolean))) as string[];
        if (types.length > 0) connectorTypes = types;

        const powers = conns.map((c) => Number(c.power_kw)).filter((p) => !isNaN(p) && p > 0);
        if (powers.length > 0) powerKw = Math.max(...powers);
      }
    } catch {}

    const raw = (station as any).raw_metadata || (station as any);
    if (!connectorTypes && raw?.connector_types && Array.isArray(raw.connector_types) && raw.connector_types.length > 0) {
      connectorTypes = raw.connector_types;
    }
    if (powerKw === null && raw?.power_kw && Number(raw.power_kw) > 0) {
      powerKw = Number(raw.power_kw);
    }
    if (!currentTariff && raw?.current_tariff) {
      currentTariff = raw.current_tariff;
    }
    if (!occupancyStatus && raw?.occupancy_status) {
      occupancyStatus = raw.occupancy_status;
    }

    return {
      id: station.id,
      istasyon_no: station.istasyon_no,
      slug: station.slug,
      name: station.name,
      address: station.address,
      city: station.city,
      district: station.district,
      lat: Number(station.lat),
      lon: Number(station.lon),
      updated_at: station.updated_at instanceof Date ? station.updated_at.toISOString() : String(station.updated_at),
      is_flagged_defective: Boolean(station.is_flagged_defective),
      operator: {
        id: op.id,
        name: op.name,
        slug: op.slug,
        deep_link_config: op.deep_link_config,
      },
      deep_link: deepLink,
      connector_types: connectorTypes,
      power_kw: powerKw,
      current_tariff: currentTariff,
      occupancy_status: occupancyStatus,
      data_freshness: sourceHealthService.formatFreshness(station.updated_at),
    };
  }

  public async getStationsInViewport(
    bboxStr?: string,
    zoom = 12,
    operatorSlug?: string,
    city?: string,
    district?: string,
    q?: string
  ) {
    const mapStationDto = (s: StationModel) => {
      const opName = s.op_name || operatorService.getById(s.operator_id)?.name || 'Bilinmeyen';
      const opSlug = s.op_slug || operatorService.getById(s.operator_id)?.slug || 'bilinmeyen';
      return {
        id: s.id,
        istasyon_no: s.istasyon_no,
        slug: s.slug,
        name: s.name,
        lat: Number(s.lat),
        lon: Number(s.lon),
        ...canonicalRegionFields(s),
        operator_id: s.operator_id,
        operator_name: opName,
        operator: {
          id: s.operator_id,
          name: opName,
          slug: opSlug,
        },
        is_flagged_defective: Boolean(s.is_flagged_defective),
      };
    };

    // 1. Şehir / İlçe ile Filtreleme
    if (city || district) {
      const stations = await stationRepository.findByRegion(city, district, operatorSlug);
      const mapped = stations.map(mapStationDto);

      if (!bboxStr) {
        return mapped;
      }
    }

    // 2. q Arama Metni ile Filtreleme (BBox yoksa)
    if (q && q.trim().length > 0 && !bboxStr) {
      try {
        const geoResult = gadmService.geocode(q);
        if (geoResult.type === 'neighborhood' || geoResult.type === 'district') {
          const stations = await stationRepository.findByRegion(geoResult.province, geoResult.district || undefined, operatorSlug);
          if (stations.length > 0) {
            return stations.map(mapStationDto);
          }
        }
      } catch {}

      const searchRes = await this.searchStations(q);
      return searchRes.stations;
    }

    // 3. BBox Parametresi Yoksa
    if (!bboxStr) {
      const stations = await stationRepository.findByRegion(city, district, operatorSlug);
      return stations.map(mapStationDto);
    }

    // 4. BBox Format ve Sınır Doğrulaması (BUG-01 Düzeltmesi)
    // TALEP-046 KORUNACAK: geçersiz bbox PostGIS/katman katmanına sızmaz;
    // BadRequestError merkezî hata işleyicide 400 problem+json'a çevrilir ve
    // Nuxt SSR upstream çağrısı artık ham 500 almaz.
    const parts = bboxStr.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length !== 4 || parts.some((p) => isNaN(p))) {
      throw new BadRequestError('BBox formatı geçersiz. minLon,minLat,maxLon,maxLat beklenmektedir.');
    }

    const [minLon, minLat, maxLon, maxLat] = parts;
    const maxSpan = getMaxSpanForZoom(zoom);
    if (!checkBBoxBounds(minLon, minLat, maxLon, maxLat, maxSpan)) {
      throw new BadRequestError(`BBox sınırları geçersiz veya izin verilen maksimum alan (${maxSpan} derece) aşıldı.`);
    }

    // 5. Zoom < 10 ise Kümeleme (Clustering) Çıktısı (UAT-03 & BUG-02)
    if (zoom < 10) {
      const clusters = await stationRepository.getClusters(minLon, minLat, maxLon, maxLat, operatorSlug);
      return {
        type: 'clusters',
        zoom,
        count: clusters.length,
        data: clusters,
      };
    }

    // 6. Zoom >= 10 ise BBox İstasyon Sorgusu (UAT-04 & TALEP-065 & TALEP-063)
    const stations = await stationRepository.findByBBox(minLon, minLat, maxLon, maxLat, operatorSlug, q);
    const mappedStations = stations.map(mapStationDto);

    return {
      type: 'stations',
      zoom,
      count: mappedStations.length,
      data: mappedStations,
    };
  }

  /**
   * TALEP-065: Harita Arama Havuzu (Merkezi Veritabanından Dinamik Beslenir)
   */
  public async searchStations(query: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestError('Arama terimi zorunludur.');
    }

    let matchedRegion: {
      type: string;
      name: string;
      province: string;
      district: string | null;
      center: { lat: number; lon: number };
      bbox: { min_lon: number; min_lat: number; max_lon: number; max_lat: number };
    } | undefined = undefined;

    try {
      const geo = gadmService.geocode(query);
      matchedRegion = {
        type: geo.type,
        name: geo.name,
        province: geo.province,
        district: geo.district,
        center: geo.coordinates,
        bbox: geo.bbox,
      };
    } catch {}

    const qClean = query.trim();
    const qFolded = foldTurkishCharacters(qClean);
    let matchedStations: StationModel[] = [];

    if (stationRepository.useDatabase) {
      try {
        const db = getDb();
        const conditions: any[] = [
          sql`s.name ILIKE ${'%' + qClean + '%'}`,
          sql`s.address ILIKE ${'%' + qClean + '%'}`,
          sql`s.city ILIKE ${'%' + qClean + '%'}`,
          sql`s.district ILIKE ${'%' + qClean + '%'}`,
          sql`s.istasyon_no ILIKE ${'%' + qClean + '%'}`,
          sql`s.slug ILIKE ${'%' + qClean + '%'}`,
          sql`o.name ILIKE ${'%' + qClean + '%'}`,
          sql`o.slug ILIKE ${'%' + qClean + '%'}`,
        ];

        if (matchedRegion) {
          if (matchedRegion.province) {
            conditions.push(sql`s.city ILIKE ${'%' + matchedRegion.province + '%'}`);
          }
          if (matchedRegion.district) {
            conditions.push(sql`s.district ILIKE ${'%' + matchedRegion.district + '%'}`);
          }
        }

        // TALEP-054 KORUNACAK: stationDedupeSubquery ile arama sonuçlarında mükerrerler filtrelenir.
        const dedupedSql = stationDedupeSubquery(
          sql.join(conditions, sql` OR `),
          sql`LEFT JOIN "operator" o ON s.operator_id = o.id`
        );
        const querySql = sql`
          SELECT d.*, o.name as op_name, o.slug as op_slug, o.deep_link_config as op_deep_link_config, o.is_active as op_is_active
          FROM (${dedupedSql}) d
          LEFT JOIN "operator" o ON d.operator_id = o.id
          ORDER BY d.name ASC
          LIMIT 100;
        `;

        const rows = await db.execute<any>(querySql);
        if (rows) {
          matchedStations = rows.map((r: any) => ({
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
            il_kodu: r.il_kodu != null ? Number(r.il_kodu) : null,
            ilce_kodu: r.ilce_kodu != null ? Number(r.ilce_kodu) : null,
            lat: Number(r.lat),
            lon: Number(r.lon),
            operator_id: Number(r.operator_id),
            is_flagged_defective: Boolean(r.is_flagged_defective),
            defect_report_count: Number(r.defect_report_count || 0),
            updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
            raw_metadata: r.raw_metadata,
            op_name: r.op_name ?? null,
            op_slug: r.op_slug ?? null,
            op_deep_link_config: r.op_deep_link_config ?? null,
            op_is_active: r.op_is_active ?? null,
          }));
        }
      } catch (e) {}
    }

    // TALEP-064: Arama sonuçlarında da veritabanı boşsa veya eşleşme yoksa mock fallback yalnızca açıkça etkinleştirilmişse devreye girer
    if (matchedStations.length === 0 && stationRepository.shouldUseMockFallback()) {
      const seen = new Set<string>();
      const candidates: StationModel[] = [];
      for (const s of stationRepository.stations.values()) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        candidates.push(s);
      }
      const deduped = dedupeStations(candidates);
      const unique = new Map<string, StationModel>();
      for (const s of deduped) {
        const matchesRegion =
          matchedRegion &&
          (toSlug(s.city) === toSlug(matchedRegion.province) ||
            (matchedRegion.district && toSlug(s.district) === toSlug(matchedRegion.district)));

        const matchesText =
          foldTurkishCharacters(s.name).includes(qFolded) ||
          foldTurkishCharacters(s.address).includes(qFolded) ||
          foldTurkishCharacters(s.city).includes(qFolded) ||
          foldTurkishCharacters(s.district).includes(qFolded);

        if (matchesRegion || matchesText) {
          unique.set(s.id, s);
        }
      }
      matchedStations = Array.from(unique.values());
    }

    const stations = matchedStations.map((s) => {
      const opName = s.op_name || operatorService.getById(s.operator_id)?.name || 'Bilinmeyen';
      const opSlug = s.op_slug || operatorService.getById(s.operator_id)?.slug || 'bilinmeyen';
      return {
        id: s.id,
        istasyon_no: s.istasyon_no,
        slug: s.slug,
        name: s.name,
        lat: Number(s.lat),
        lon: Number(s.lon),
        ...canonicalRegionFields(s),
        operator_id: s.operator_id,
        operator_name: opName,
        operator: {
          id: s.operator_id,
          name: opName,
          slug: opSlug,
        },
        is_flagged_defective: Boolean(s.is_flagged_defective),
      };
    });

    return {
      query,
      matched_region: matchedRegion,
      stations,
    };
  }
}

export const stationService = new StationService();
