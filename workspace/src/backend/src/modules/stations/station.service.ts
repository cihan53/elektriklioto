
// VARSAYIM: Veritabanı istemcisi ve Drizzle şema tabloları `../../db/client.js`
// ve `../../db/schema.js` altında, paket_secim_raporu'nda onaylanan
// `drizzle-orm` + `postgres` (porsager) sürücüsüyle dışa aktarılmış kabul
// edilmiştir (mevcut modüller arasında ayrı bir db istemci dosyası
// listelenmediği için proje genelindeki yerleşik konvansiyon varsayılmıştır).
import { and, gte, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { station, operator, connector } from '../../db/schema.js';

export class InvalidBBoxError extends Error {}

export interface BBoxQueryParams {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  zoom: number;
  sinceEpoch?: number;
}

interface OperatorRefDTO {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
}

interface StationClusterDTO {
  type: 'cluster';
  cluster_count: number;
  center_lat: number;
  center_lon: number;
}

interface StationPinDTO {
  type: 'station';
  station_uid: string;
  istasyon_no: string;
  slug: string;
  name: string | null;
  lat: number;
  lon: number;
  operator: OperatorRefDTO | null;
  connector_types: string[] | null;
  power_kw: number | null;
  current_tariff: number | null;
  data_freshness_hours: number | null;
  updated_at: string;
}

export interface StationsBBoxResult {
  mode: 'cluster' | 'detail';
  count: number;
  items: Array<StationClusterDTO | StationPinDTO>;
}

const CLUSTER_ZOOM_THRESHOLD = 10;

function freshnessHours(updatedAt: Date | string | null | undefined): number | null {
  if (!updatedAt) return null;
  const ts = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (Number.isNaN(ts.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - ts.getTime()) / (1000 * 60 * 60)));
}

// TALEP-046: KÖK NEDEN DÜZELTMESİ.
// Önceki sürümde bu eşleyici, `operator_id` bir markaya çözümlenemeyen
// (entity-resolution sırasında eşleşmemiş / henüz normalize edilmemiş)
// istasyon kayıtlarında `row.operator.name` gibi alanlara doğrudan erişip
// `null` üzerinde patlıyordu. Bu durum küçük test bbox'larında (ör. UAT-04
// İstanbul alt kümesi) nadiren tetiklenirken, web istemcisinin SSR aşamasında
// istediği ülke geneli varsayılan görünümde (daha geniş/karma veri kümesi)
// tetiklenip HTTP 500'e yol açıyordu. Bu fonksiyon KORUNACAK: operatör,
// soket tipleri, güç ve tarife alanları `NULL` iken uydurma değer üretmeden
// güvenle `null` döner (paket_secim_raporu Nullable DTO Sözleşmesi).
function mapStationRow(row: {
  id: string;
  istasyonNo: string;
  slug: string;
  name: string | null;
  lat: string | number;
  lon: string | number;
  updatedAt: Date | string | null;
  operatorId: number | null;
  operatorSlug: string | null;
  operatorName: string | null;
  operatorIsActive: boolean | null;
  connectorTypes: string[] | null;
  powerKw: string | number | null;
  currentTariff: string | number | null;
}): StationPinDTO {
  const operatorRef: OperatorRefDTO | null =
    row.operatorId != null && row.operatorSlug != null && row.operatorName != null
      ? {
          id: row.operatorId,
          slug: row.operatorSlug,
          name: row.operatorName,
          is_active: Boolean(row.operatorIsActive),
        }
      : null;

  return {
    type: 'station',
    station_uid: row.id,
    istasyon_no: row.istasyonNo,
    slug: row.slug,
    name: row.name ?? null,
    lat: Number(row.lat),
    lon: Number(row.lon),
    operator: operatorRef,
    connector_types:
      row.connectorTypes && row.connectorTypes.length > 0 ? row.connectorTypes : null,
    power_kw: row.powerKw != null ? Number(row.powerKw) : null,
    current_tariff: row.currentTariff != null ? Number(row.currentTariff) : null,
    data_freshness_hours: freshnessHours(row.updatedAt),
    updated_at:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : row.updatedAt ?? new Date(0).toISOString(),
  };
}

/**
 * Viewport (bbox) tabanlı istasyon listeleme.
 * zoom < 10: PostGIS ST_SnapToGrid ile kümelenmiş özet döner (bellek/ağ
 * bütçesini korumak için — 16.788 istasyonun tamamı asla tek seferde
 * istemciye basılmaz, teknik_mimari_dokumani.md §7.2).
 * zoom >= 10: bbox içindeki bireysel istasyon pinleri (LEFT JOIN operator +
 * connector ile, ikisi de NULL olabilir).
 */
export async function getStationsInBBox(
  params: BBoxQueryParams,
): Promise<StationsBBoxResult> {
  const { minLon, minLat, maxLon, maxLat, zoom, sinceEpoch } = params;

  if (
    ![minLon, minLat, maxLon, maxLat].every((n) => Number.isFinite(n)) ||
    minLon >= maxLon ||
    minLat >= maxLat
  ) {
    // TALEP-046: servis katmanı da rotadan bağımsız olarak kendi girdisini
    // doğrular — bu fonksiyon ileride rota katmanı dışından çağrılırsa dahi
    // ham NaN/PostGIS istisnası sızdırmaz.
    throw new InvalidBBoxError('bbox sınırları geçersiz veya ters sıralı.');
  }

  const envelope = sql`ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326)`;
  const sinceFilter = sinceEpoch
    ? and(gte(station.updatedAt, sql`to_timestamp(${sinceEpoch})`))
    : undefined;

  if (zoom < CLUSTER_ZOOM_THRESHOLD) {
    // Düşük zoom: ST_SnapToGrid ile grid hücresi başına küme özeti.
    // Grid boyutu zoom seviyesine göre kabaca ölçeklenir (yüksek zoom =
    // küçük hücre). zoom her koşulda >=0 tamsayı olarak şema tarafından
    // garanti edildiğinden bölme/negatif üs riski yoktur.
    const gridSize = Math.max(0.05, 4 / Math.pow(2, Math.max(zoom, 1)));
    const rows = await db.execute<{
      cluster_count: number;
      center_lat: number;
      center_lon: number;
    }>(sql`
      SELECT
        COUNT(*)::int AS cluster_count,
        AVG(${station.lat})::float8 AS center_lat,
        AVG(${station.lon})::float8 AS center_lon
      FROM ${station}
      WHERE ST_Intersects(${station.geom}, ${envelope})
        ${sinceFilter ? sql`AND ${sinceFilter}` : sql``}
      GROUP BY ST_SnapToGrid(${station.geom}::geometry, ${gridSize})
    `);

    const items: StationClusterDTO[] = rows.map((r) => ({
      type: 'cluster',
      cluster_count: Number(r.cluster_count),
      center_lat: Number(r.center_lat),
      center_lon: Number(r.center_lon),
    }));

    return { mode: 'cluster', count: items.length, items };
  }

  const rows = await db.execute<{
    id: string;
    istasyonNo: string;
    slug: string;
    name: string | null;
    lat: string;
    lon: string;
    updatedAt: Date | string | null;
    operatorId: number | null;
    operatorSlug: string | null;
    operatorName: string | null;
    operatorIsActive: boolean | null;
    connectorTypes: string[] | null;
    powerKw: string | null;
    currentTariff: string | null;
  }>(sql`
    SELECT
      s.id AS "id",
      s.istasyon_no AS "istasyonNo",
      s.slug AS "slug",
      s.name AS "name",
      s.lat AS "lat",
      s.lon AS "lon",
      s.updated_at AS "updatedAt",
      o.id AS "operatorId",
      o.slug AS "operatorSlug",
      o.name AS "operatorName",
      o.is_active AS "operatorIsActive",
      NULL::text[] AS "connectorTypes",
      NULL::numeric AS "powerKw",
      NULL::numeric AS "currentTariff"
    FROM ${station} s
    LEFT JOIN ${operator} o ON o.id = s.operator_id
    WHERE ST_Intersects(s.geom, ${envelope})
      ${sinceFilter ? sql`AND ${sinceFilter}` : sql``}
    LIMIT 2000
  `);

  const items = rows.map(mapStationRow);
  return { mode: 'detail', count: items.length, items };
}

export async function getStationsDelta(sinceEpoch: number): Promise<StationPinDTO[]> {
  if (!Number.isFinite(sinceEpoch) || sinceEpoch < 0) {
    throw new InvalidBBoxError('since parametresi geçerli bir epoch saniyesi olmalıdır.');
  }

  const rows = await db.execute<{
    id: string;
    istasyonNo: string;
    slug: string;
    name: string | null;
    lat: string;
    lon: string;
    updatedAt: Date | string | null;
    operatorId: number | null;
    operatorSlug: string | null;
    operatorName: string | null;
    operatorIsActive: boolean | null;
    connectorTypes: string[] | null;
    powerKw: string | null;
    currentTariff: string | null;
  }>(sql`
    SELECT
      s.id AS "id",
      s.istasyon_no AS "istasyonNo",
      s.slug AS "slug",
      s.name AS "name",
      s.lat AS "lat",
      s.lon AS "lon",
      s.updated_at AS "updatedAt",
      o.id AS "operatorId",
      o.slug AS "operatorSlug",
      o.name AS "operatorName",
      o.is_active AS "operatorIsActive",
      NULL::text[] AS "connectorTypes",
      NULL::numeric AS "powerKw",
      NULL::numeric AS "currentTariff"
    FROM ${station} s
    LEFT JOIN ${operator} o ON o.id = s.operator_id
    WHERE s.updated_at >= to_timestamp(${sinceEpoch})
    ORDER BY s.updated_at ASC
    LIMIT 5000
  `);

  return rows.map(mapStationRow);
}

export async function getStationBySlug(slug: string): Promise<
  | (Omit<StationPinDTO, 'type'> & {
      address: string | null;
      city: string | null;
      district: string | null;
    })
  | null
> {
  const rows = await db.execute<{
    id: string;
    istasyonNo: string;
    slug: string;
    name: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
    lat: string;
    lon: string;
    updatedAt: Date | string | null;
    operatorId: number | null;
    operatorSlug: string | null;
    operatorName: string | null;
    operatorIsActive: boolean | null;
  }>(sql`
    SELECT
      s.id AS "id",
      s.istasyon_no AS "istasyonNo",
      s.slug AS "slug",
      s.name AS "name",
      s.address AS "address",
      s.city AS "city",
      s.district AS "district",
      s.lat AS "lat",
      s.lon AS "lon",
      s.updated_at AS "updatedAt",
      o.id AS "operatorId",
      o.slug AS "operatorSlug",
      o.name AS "operatorName",
      o.is_active AS "operatorIsActive"
    FROM ${station} s
    LEFT JOIN ${operator} o ON o.id = s.operator_id
    WHERE s.slug = ${slug}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return null;

  // TALEP-046: Faz 1'de connector envanteri boştur (kapsam dışı — bkz.
  // proje_kapsami.md "Soket seviyesi envanter Faz 1'de üretilmez"). Bu
  // sorgu bilerek connector tablosuna JOIN atmaz; `connector_types`,
  // `power_kw`, `current_tariff` sabit `null` döner, uydurma değer YOK.
  void connector; // varlığı korunur; Faz 1'de sorguya dahil edilmez.

  const mapped = mapStationRow({
    ...row,
    connectorTypes: null,
    powerKw: null,
    currentTariff: null,
  });
  const { type: _type, ...rest } = mapped;
  return { ...rest, address: row.address, city: row.city, district: row.district };
}
