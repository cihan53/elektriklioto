
import fs from 'node:fs';
import path from 'node:path';
import { sql, eq, or } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { stations } from '../../db/schema/stations.js';
import { connectors } from '../../db/schema/connectors.js';
import { operators } from '../../db/schema/operators.js';
import { deepLinkService } from '../deeplink/deeplink.service.js';
import { operatorService } from '../operators/operator.service.js';
import { sourceHealthService } from '../worker/source-health.service.js';
import { gadmService } from '../gadm/gadm.service.js';
import { toSlug, foldTurkishCharacters } from '../../utils/unicode.js';
import { validateBBox } from '../../utils/geo.js';
import { BadRequestError } from '../../utils/errors.js';

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
  lat: number;
  lon: number;
  operator_id: number;
  is_flagged_defective: boolean;
  defect_report_count: number;
  updated_at: Date;
  raw_metadata?: Record<string, unknown> | null;
}

const DEFAULT_STATIONS: StationModel[] = [
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

let isDatabaseSeededFlag = false;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (isDatabaseSeededFlag) return;
  try {
    const db = getDb();
    const countRes = await db.execute<{ count: string }>(sql`SELECT count(*)::text as count FROM "station";`);
    const count = Number(countRes[0]?.count || 0);
    if (count >= 100) {
      isDatabaseSeededFlag = true;
      return;
    }

    const candidatePaths = [
      path.resolve(process.cwd(), 'src/data/cpo_stations.json'),
      path.resolve(process.cwd(), 'workspace/src/backend/src/data/cpo_stations.json'),
      path.resolve(process.cwd(), '../data/cpo_stations.json'),
      '/Users/cihan/PROJECT/elektriklioto-gemini/workspace/src/backend/src/data/cpo_stations.json',
      '/Users/cihan/.gemini/antigravity-cli/scratch/workspace/src/backend/src/data/cpo_stations.json',
    ];

    let dataRaw = '';
    for (const cp of candidatePaths) {
      if (fs.existsSync(cp)) {
        dataRaw = fs.readFileSync(cp, 'utf-8');
        break;
      }
    }

    if (dataRaw) {
      const items = JSON.parse(dataRaw);
      console.log(`[DatabaseSeeder] Veritabanı boş, ${items.length} istasyon yükleniyor...`);
      for (const item of items) {
        try {
          await db
            .insert(stations)
            .values({
              id: item.id || undefined,
              istasyon_no: item.istasyon_no || `ŞRJ/${Math.floor(Math.random() * 90000 + 10000)}`,
              slug: item.slug || toSlug(item.name || 'istasyon'),
              name: item.name || 'Şarj İstasyonu',
              address: item.address || '',
              city: item.city || 'Türkiye',
              district: item.district || '',
              lat: String(item.lat || 39.0),
              lon: String(item.lon || 35.0),
              operator_id: Number(item.operator_id || 1),
              is_flagged_defective: false,
              defect_report_count: 0,
              updated_at: new Date(),
            })
            .onConflictDoNothing();

          if (item.id && Array.isArray(item.connectors)) {
            for (const c of item.connectors) {
              await db
                .insert(connectors)
                .values({
                  station_id: item.id,
                  socket_type: c.socket_type || c.type || 'Type 2',
                  power_kw: c.power_kw ? String(c.power_kw) : null,
                  current_type: c.current_type || 'AC',
                  status: c.status || 'AVAILABLE',
                })
                .onConflictDoNothing();
            }
          }
        } catch {}
      }
      console.log('[DatabaseSeeder] İstasyonlar ve soketler veritabanına başarıyla yüklendi.');
    }

    // Default 4 istasyon
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
  } catch (err) {
    // DB offline or fallback
  }
}

export const stationRepository = {
  stations: new Map<string, StationModel>(),
  useDatabase: true,

  initDefaults() {
    this.seed(DEFAULT_STATIONS);
    if (process.env.NODE_ENV !== 'test') {
      ensureDatabaseSeeded().catch(() => {});
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

        if (rows.length > 0) {
          const r = rows[0];
          const stModel: StationModel = {
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
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
      } catch {
        // DB fallback
      }
    }

    return this.stations.get(normalized) || this.stations.get(slug) || null;
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

        if (rows.length > 0) {
          const r = rows[0];
          const stModel: StationModel = {
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
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
      } catch {
        // DB fallback
      }
    }

    return this.stations.get(id) || null;
  },

  async findByIdOrSlug(identifier: string): Promise<StationModel | null> {
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
    operatorSlug?: string
  ): Promise<StationModel[]> {
    if (this.useDatabase) {
      try {
        const db = getDb();
        const query = sql`
          SELECT s.*
          FROM "station" s
          ${operatorSlug ? sql`JOIN "operator" o ON s.operator_id = o.id AND o.slug = ${operatorSlug}` : sql``}
          WHERE s.lon >= ${minLon} AND s.lon <= ${maxLon}
            AND s.lat >= ${minLat} AND s.lat <= ${maxLat}
          ORDER BY s.updated_at DESC
          LIMIT 2000;
        `;
        const rows = await db.execute<any>(query);
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
            lat: Number(r.lat),
            lon: Number(r.lon),
            operator_id: Number(r.operator_id),
            is_flagged_defective: Boolean(r.is_flagged_defective),
            defect_report_count: Number(r.defect_report_count || 0),
            updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
            raw_metadata: r.raw_metadata,
          }));
        }
      } catch (e) {
        // Fallback to memory
      }
    }

    const result: StationModel[] = [];
    const unique = new Set<string>();

    for (const s of this.stations.values()) {
      if (unique.has(s.id)) continue;
      unique.add(s.id);

      if (s.lon >= minLon && s.lon <= maxLon && s.lat >= minLat && s.lat <= maxLat) {
        if (operatorSlug) {
          const op = operatorService.getBySlug(operatorSlug);
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
        const query = sql`
          SELECT 
            s.city,
            COUNT(*)::int as count,
            ROUND(AVG(s.lat), 6)::float as lat,
            ROUND(AVG(s.lon), 6)::float as lon
          FROM "station" s
          ${operatorSlug ? sql`JOIN "operator" o ON s.operator_id = o.id AND o.slug = ${operatorSlug}` : sql``}
          WHERE s.lon >= ${minLon} AND s.lon <= ${maxLon}
            AND s.lat >= ${minLat} AND s.lat <= ${maxLat}
          GROUP BY s.city
          HAVING COUNT(*) > 0
          ORDER BY count DESC;
        `;
        const rows = await db.execute<any>(query);
        if (rows && rows.length > 0) {
          return rows.map((r: any, idx: number) => ({
            cluster_id: `cluster-${toSlug(r.city || 'bolge')}-${idx}`,
            count: Number(r.count),
            lat: Number(r.lat),
            lon: Number(r.lon),
          }));
        }
      } catch (e) {
        // fallback
      }
    }

    const cityGroups = new Map<string, { count: number; latSum: number; lonSum: number }>();
    for (const s of this.stations.values()) {
      if (s.lon >= minLon && s.lon <= maxLon && s.lat >= minLat && s.lat <= maxLat) {
        if (operatorSlug) {
          const op = operatorService.getBySlug(operatorSlug);
          if (!op || s.operator_id !== op.id) continue;
        }
        const cityKey = s.city || 'Türkiye';
        const group = cityGroups.get(cityKey) || { count: 0, latSum: 0, lonSum: 0 };
        group.count += 1;
        group.latSum += s.lat;
        group.lonSum += s.lon;
        cityGroups.set(cityKey, group);
      }
    }

    return Array.from(cityGroups.entries()).map(([city, data], idx) => ({
      cluster_id: `cluster-${toSlug(city)}-${idx}`,
      count: data.count,
      lat: Number((data.latSum / data.count).toFixed(6)),
      lon: Number((data.lonSum / data.count).toFixed(6)),
    }));
  },

  async findByRegion(citySlug?: string, districtSlug?: string, operatorSlug?: string): Promise<StationModel[]> {
    if (this.useDatabase && process.env.NODE_ENV !== 'test') {
      try {
        const db = getDb();
        const conditions: any[] = [];
        if (citySlug) {
          conditions.push(sql`s.city ILIKE ${'%' + citySlug + '%'}`);
        }
        if (districtSlug) {
          conditions.push(sql`s.district ILIKE ${'%' + districtSlug + '%'}`);
        }
        if (operatorSlug) {
          conditions.push(sql`o.slug = ${operatorSlug}`);
        }

        const query = sql`
          SELECT s.*
          FROM "station" s
          LEFT JOIN "operator" o ON s.operator_id = o.id
          WHERE ${conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`1=1`}
          ORDER BY s.name ASC
          LIMIT 500;
        `;
        const rows = await db.execute<any>(query);
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
            lat: Number(r.lat),
            lon: Number(r.lon),
            operator_id: Number(r.operator_id),
            is_flagged_defective: Boolean(r.is_flagged_defective),
            defect_report_count: Number(r.defect_report_count || 0),
            updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
            raw_metadata: r.raw_metadata,
          }));
        }
      } catch (e) {
        // Fallback
      }
    }

    const result: StationModel[] = [];
    const unique = new Set<string>();

    const normCity = citySlug ? toSlug(citySlug) : undefined;
    const normDistrict = districtSlug ? toSlug(districtSlug) : undefined;

    for (const s of this.stations.values()) {
      if (unique.has(s.id)) continue;
      unique.add(s.id);

      if (normCity && toSlug(s.city) !== normCity) continue;
      if (normDistrict && toSlug(s.district) !== normDistrict) continue;

      if (operatorSlug) {
        const op = operatorService.getBySlug(operatorSlug);
        if (!op || s.operator_id !== op.id) continue;
      }

      result.push(s);
    }
    return result;
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

// Varsayılan istasyonları yükle
stationRepository.initDefaults();

export class StationService {
  public async getStationDetail(slug: string) {
    const station = await stationRepository.findBySlug(slug);
    if (!station) return null;

    let op = operatorService.getById(station.operator_id);
    if (!op) {
      try {
        const db = getDb();
        const opRows = await db.select().from(operators).where(eq(operators.id, station.operator_id)).limit(1);
        if (opRows.length > 0) {
          op = {
            id: opRows[0].id,
            name: opRows[0].name,
            slug: opRows[0].slug,
            deep_link_config: opRows[0].deep_link_config as any,
            is_active: opRows[0].is_active,
          };
        }
      } catch {}
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

    // Soket ve güç verisini veritabanından çek (varsa)
    let connectorTypes: string[] | null = null;
    let powerKw: number | null = null;

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
    } catch {
      // DB ulaşılamazsa null
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
      // Faz 1 zorunlu kısıt: Veri yoksa NULL, veritabanında soket kaydı varsa gerçek değer
      connector_types: connectorTypes,
      power_kw: powerKw,
      current_tariff: null,
      occupancy_status: null,
      // S5 Veri Tazeliği Rozeti (US-18)
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
    // 1. Şehir / İlçe ile Filtreleme (eğer BBox yoksa doğrudan dizi döner)
    if (city || district) {
      const stations = await stationRepository.findByRegion(city, district, operatorSlug);
      const mapped = stations.map((s) => {
        const op = operatorService.getById(s.operator_id) || {
          id: s.operator_id,
          name: 'Bilinmeyen',
          slug: 'bilinmeyen',
        };
        return {
          id: s.id,
          istasyon_no: s.istasyon_no,
          slug: s.slug,
          name: s.name,
          lat: Number(s.lat),
          lon: Number(s.lon),
          city: s.city,
          district: s.district,
          operator_id: s.operator_id,
          operator_name: op.name,
          operator: {
            id: op.id,
            name: op.name,
            slug: op.slug,
          },
          is_flagged_defective: Boolean(s.is_flagged_defective),
        };
      });

      if (!bboxStr) {
        return mapped;
      }
    }

    // 2. q Arama Metni ile Filtreleme (eğer BBox yoksa)
    if (q && q.trim().length > 0 && !bboxStr) {
      try {
        const geoResult = gadmService.geocode(q);
        if (geoResult.type === 'neighborhood' || geoResult.type === 'district') {
          const stations = await stationRepository.findByRegion(geoResult.province, geoResult.district || undefined, operatorSlug);
          if (stations.length > 0) {
            return stations.map((s) => {
              const op = operatorService.getById(s.operator_id) || {
                id: s.operator_id,
                name: 'Bilinmeyen',
                slug: 'bilinmeyen',
              };
              return {
                id: s.id,
                istasyon_no: s.istasyon_no,
                slug: s.slug,
                name: s.name,
                lat: Number(s.lat),
                lon: Number(s.lon),
                city: s.city,
                district: s.district,
                operator_id: s.operator_id,
                operator_name: op.name,
                operator: {
                  id: op.id,
                  name: op.name,
                  slug: op.slug,
                },
                is_flagged_defective: Boolean(s.is_flagged_defective),
              };
            });
          }
        }
      } catch {
        // Geocode bulunamazsa devam et
      }

      const searchRes = await this.searchStations(q);
      return searchRes.stations;
    }

    // 3. BBox Parametresi Yoksa
    if (!bboxStr) {
      const stations = await stationRepository.findByRegion(city, district, operatorSlug);
      return stations.map((s) => {
        const op = operatorService.getById(s.operator_id) || {
          id: s.operator_id,
          name: 'Bilinmeyen',
          slug: 'bilinmeyen',
        };
        return {
          id: s.id,
          istasyon_no: s.istasyon_no,
          slug: s.slug,
          name: s.name,
          lat: Number(s.lat),
          lon: Number(s.lon),
          city: s.city,
          district: s.district,
          operator_id: s.operator_id,
          operator_name: op.name,
          operator: {
            id: op.id,
            name: op.name,
            slug: op.slug,
          },
          is_flagged_defective: Boolean(s.is_flagged_defective),
        };
      });
    }

    // 4. BBox Format ve Sınır Doğrulaması (BUG-01 Düzeltmesi)
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

    // 6. Zoom >= 10 ise BBox İstasyon Sorgusu (UAT-04)
    const stations = await stationRepository.findByBBox(minLon, minLat, maxLon, maxLat, operatorSlug);
    const mappedStations = stations.map((s) => {
      const op = operatorService.getById(s.operator_id) || {
        id: s.operator_id,
        name: 'Bilinmeyen',
        slug: 'bilinmeyen',
      };
      return {
        id: s.id,
        istasyon_no: s.istasyon_no,
        slug: s.slug,
        name: s.name,
        lat: Number(s.lat),
        lon: Number(s.lon),
        city: s.city,
        district: s.district,
        operator_id: s.operator_id,
        operator_name: op.name,
        operator: {
          id: op.id,
          name: op.name,
          slug: op.slug,
        },
        is_flagged_defective: Boolean(s.is_flagged_defective),
      };
    });

    return {
      type: 'stations',
      zoom,
      count: mappedStations.length,
      data: mappedStations,
    };
  }

  /**
   * Harita Arama (GADM CBS Entegrasyonlu & Veritabanı Destekli)
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
    } catch {
      // Bölge eşleşmezse devam et
    }

    const qClean = query.trim();
    const qFolded = foldTurkishCharacters(qClean);
    let matchedStations: StationModel[] = [];

    if (stationRepository.useDatabase && process.env.NODE_ENV !== 'test') {
      try {
        const db = getDb();
        const conditions: any[] = [
          sql`s.name ILIKE ${'%' + qClean + '%'}`,
          sql`s.address ILIKE ${'%' + qClean + '%'}`,
          sql`s.city ILIKE ${'%' + qClean + '%'}`,
          sql`s.district ILIKE ${'%' + qClean + '%'}`,
        ];

        if (matchedRegion) {
          if (matchedRegion.province) {
            conditions.push(sql`s.city ILIKE ${'%' + matchedRegion.province + '%'}`);
          }
          if (matchedRegion.district) {
            conditions.push(sql`s.district ILIKE ${'%' + matchedRegion.district + '%'}`);
          }
        }

        const querySql = sql`
          SELECT s.*
          FROM "station" s
          WHERE ${sql.join(conditions, sql` OR `)}
          ORDER BY s.name ASC
          LIMIT 100;
        `;

        const rows = await db.execute<any>(querySql);
        if (rows && rows.length > 0) {
          matchedStations = rows.map((r: any) => ({
            id: r.id,
            istasyon_no: r.istasyon_no,
            slug: r.slug,
            name: r.name,
            address: r.address,
            city: r.city,
            district: r.district,
            lat: Number(r.lat),
            lon: Number(r.lon),
            operator_id: Number(r.operator_id),
            is_flagged_defective: Boolean(r.is_flagged_defective),
            defect_report_count: Number(r.defect_report_count || 0),
            updated_at: r.updated_at ? new Date(r.updated_at) : new Date(),
            raw_metadata: r.raw_metadata,
          }));
        }
      } catch (e) {
        // Fallback
      }
    }

    // Fallback veya test modu
    if (matchedStations.length === 0) {
      const unique = new Map<string, StationModel>();
      for (const s of stationRepository.stations.values()) {
        if (unique.has(s.id)) continue;

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
      const op = operatorService.getById(s.operator_id) || {
        id: s.operator_id,
        name: 'Bilinmeyen',
        slug: 'bilinmeyen',
      };
      return {
        id: s.id,
        istasyon_no: s.istasyon_no,
        slug: s.slug,
        name: s.name,
        lat: Number(s.lat),
        lon: Number(s.lon),
        city: s.city,
        district: s.district,
        operator_id: s.operator_id,
        operator_name: op.name,
        operator: {
          id: op.id,
          name: op.name,
          slug: op.slug,
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
