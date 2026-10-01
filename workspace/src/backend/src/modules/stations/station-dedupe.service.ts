
/**
 * TALEP-054: İstasyon mükerrer kayıt (duplicate) tekilleştirme servisi.
 *
 * Kök neden: aynı fiziksel istasyon birden fazla kaynaktan farklı kimliklerle
 * yazılabiliyor — EPDK kanonik numarası (`ŞRJ/xxxx`) yanında CPO senkronizasyonu
 * `ZES/`, `TRU/`, `ESR/`, `VLT/`, `CPO/` önekli kayıtlar ve eski tohumlama
 * yollarının rastgele `ŞRJ/#####` fallback'leri üretiyordu. `istasyon_no`
 * UNIQUE kısıtı bu çapraz-kaynak kopyaları yakalayamadığı için harita
 * kümelerinde istasyon sayıları şişiyordu (ör. yalnız İstanbul > 13k).
 *
 * İki seviyeli tekilleştirme uygulanır:
 *   1) Kanonik çapa: aynı (katlanmış) `istasyon_no` taşıyan satırlar tekleştirilir.
 *   2) Fiziksel imza: `foldTurkishCharacters(name) | operator_id | lat/lon (3 ondalık
 *      ≈ 110 m grid)` — farklı `istasyon_no` altındaki aynı saha kayıtları birleşir.
 *
 * Sorgu tarafı `stationDedupeSubquery` ile DISTINCT ON uygular (sayım/liste
 * tutarlılığı); `deduplicateStationTable` mevcut DB kopyalarını kalıcı olarak
 * temizler (çocuk satırlar koruyucu satıra taşınır, sonra mükerrerler silinir).
 */
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { foldTurkishCharacters } from '../../utils/unicode.js';

type SqlChunk = ReturnType<typeof sql>;

// İmza koordinat hassasiyeti: 3 ondalık ≈ 110 m — aynı fiziksel saha toleransı.
const SIGNATURE_DECIMALS = 3;

export interface StationDedupeInput {
  istasyon_no?: string | null;
  name?: string | null;
  operator_id?: number | string | null;
  lat?: number | string | null;
  lon?: number | string | null;
}

export interface StationDedupeReport {
  removed_by_istasyon_no: number;
  removed_by_signature: number;
  reparented_connectors: number;
  reparented_reports: number;
  reparented_tariffs: number;
  removed_total: number;
}

function roundCoord(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(SIGNATURE_DECIMALS) : '0.000';
}

/**
 * Seviye-1 anahtar: kanonik istasyon kimliği. Türkçe katlama ile `ŞRJ/1`,
 * `SRJ/1`, `srj/1` varyantları aynı anahtara düşer. Boşsa null döner.
 */
export function stationDedupeKey(s: StationDedupeInput): string | null {
  const no = String(s.istasyon_no ?? '').trim();
  if (!no) return null;
  return `no:${foldTurkishCharacters(no)}`;
}

/**
 * Seviye-2 anahtar: fiziksel saha imzası (ad + operatör + ~110 m koordinat grid).
 * `istasyon_no` farklı olsa bile aynı sahayı yakalar.
 */
export function stationSignatureKey(s: StationDedupeInput): string {
  const name = foldTurkishCharacters(String(s.name ?? '')).replace(/\s+/g, ' ').trim();
  const op = s.operator_id == null ? '0' : String(s.operator_id);
  return `sig:${name}|${op}|${roundCoord(s.lat)}|${roundCoord(s.lon)}`;
}

/**
 * Bellek içi iki seviyeli tekilleştirme — ilk görülen kayıt korunur.
 */
export function dedupeStations<T extends StationDedupeInput>(rows: T[]): T[] {
  const seenNo = new Set<string>();
  const seenSig = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const noKey = stationDedupeKey(r);
    const sigKey = stationSignatureKey(r);
    if ((noKey && seenNo.has(noKey)) || seenSig.has(sigKey)) continue;
    if (noKey) seenNo.add(noKey);
    seenSig.add(sigKey);
    out.push(r);
  }
  return out;
}

/**
 * `istasyon_no` taşımayan kayıtlar için deterministik kimlik üretir.
 * Eski kod her çalıştırmada rastgele `ŞRJ/#####` üretiyordu; bu, tekrar
 * tohumlamalarda aynı sahanın yeni kimlikle kopyalanmasına yol açıyordu.
 * `SYNC-` öneki gerçek EPDK `ŞRJ/` uzayıyla çakışmaz.
 */
export function derivedStationNo(item: StationDedupeInput): string {
  const digest = createHash('sha256').update(stationSignatureKey(item)).digest('hex').slice(0, 20);
  return `SYNC-${digest}`;
}

/**
 * DB tarafı iki seviyeli DISTINCT ON tekilleştirmesi.
 * `station` tablosu `s` takma adıyla sorgulanır; `joinClause` isteğe bağlı
 * operatör join'i taşır. Dönen alt sorgu `d` takma adıyla kullanılmalıdır;
 * `_sig` yardımcı sütunu sonuçta görünür ancak yanıta yansıtılmaz.
 */
export function stationDedupeSubquery(whereClause: SqlChunk, joinClause: SqlChunk = sql``): SqlChunk {
  return sql`
    SELECT DISTINCT ON (d1._sig) d1.*
    FROM (
      SELECT DISTINCT ON (COALESCE(NULLIF(btrim(s.istasyon_no), ''), s.id::text))
        s.*,
        ('sig:' || md5(
          lower(btrim(s.name)) || '|' ||
          COALESCE(s.operator_id::text, '0') || '|' ||
          round(s.lat::numeric, 3)::text || '|' ||
          round(s.lon::numeric, 3)::text
        )) AS _sig
      FROM "station" s
      ${joinClause}
      WHERE ${whereClause}
      ORDER BY
        COALESCE(NULLIF(btrim(s.istasyon_no), ''), s.id::text),
        s.updated_at DESC, s.created_at ASC, s.id
    ) d1
    ORDER BY
      d1._sig,
      ((upper(btrim(d1.istasyon_no)) LIKE 'ŞRJ/%' OR upper(btrim(d1.istasyon_no)) LIKE 'SRJ/%')) DESC,
      d1.updated_at DESC, d1.created_at ASC, d1.id
  `;
}

/**
 * Tek bir tekilleştirme turu: mükerrer satırların çocuk kayıtları
 * (connector / station_report / tariff_history) koruyucu satıra taşınır,
 * ardından mükerrer istasyonlar tek atomik CTE ifadesiyle silinir.
 * Çocuk tabloları bulunmayan eski şemalarda yalnız-silme varyantına düşer.
 */
async function runDedupePass(
  db: any,
  scopeClause: SqlChunk,
  partitionExpr: SqlChunk,
  orderExpr: SqlChunk,
): Promise<{ deleted: number; connectors: number; reports: number; tariffs: number }> {
  const rankedCte = sql`
    WITH ranked AS (
      SELECT s.id, first_value(s.id) OVER w AS keep_id, row_number() OVER w AS rn
      FROM "station" s
      ${scopeClause}
      WINDOW w AS (PARTITION BY ${partitionExpr} ORDER BY ${orderExpr})
    )
  `;

  const withChildren = sql`
    ${rankedCte},
    reparent_conn AS (
      UPDATE "connector" c SET station_id = r.keep_id FROM ranked r
      WHERE c.station_id = r.id AND r.rn > 1 RETURNING c.id
    ),
    reparent_rep AS (
      UPDATE "station_report" rp SET station_id = r.keep_id FROM ranked r
      WHERE rp.station_id = r.id AND r.rn > 1 RETURNING rp.id
    ),
    reparent_tar AS (
      UPDATE "tariff_history" t SET station_id = r.keep_id FROM ranked r
      WHERE t.station_id = r.id AND r.rn > 1 RETURNING t.id
    ),
    deleted AS (
      DELETE FROM "station" s USING ranked r WHERE s.id = r.id AND r.rn > 1 RETURNING s.id
    )
    SELECT
      (SELECT count(*)::int FROM deleted) AS deleted,
      (SELECT count(*)::int FROM reparent_conn) AS connectors,
      (SELECT count(*)::int FROM reparent_rep) AS reports,
      (SELECT count(*)::int FROM reparent_tar) AS tariffs
  `;

  try {
    const rows = await db.execute(withChildren);
    const r0 = (rows && rows[0]) || {};
    return {
      deleted: Number(r0.deleted) || 0,
      connectors: Number(r0.connectors) || 0,
      reports: Number(r0.reports) || 0,
      tariffs: Number(r0.tariffs) || 0,
    };
  } catch {
    const deleteOnly = sql`
      ${rankedCte},
      deleted AS (
        DELETE FROM "station" s USING ranked r WHERE s.id = r.id AND r.rn > 1 RETURNING s.id
      )
      SELECT (SELECT count(*)::int FROM deleted) AS deleted
    `;
    const rows = await db.execute(deleteOnly);
    return {
      deleted: Number(rows?.[0]?.deleted) || 0,
      connectors: 0,
      reports: 0,
      tariffs: 0,
    };
  }
}

/**
 * Veritabanındaki mevcut mükerrer istasyon kayıtlarını kalıcı olarak temizler.
 * Tur 1: aynı `istasyon_no` taşıyan satırlar. Tur 2: aynı fiziksel imzayı
 * taşıyan fakat farklı `istasyon_no`'lu satırlar (CPO kopyaları); koruyucu
 * olarak kanonik `ŞRJ/`/`SRJ/` kaydı tercih edilir.
 */
export async function deduplicateStationTable(db: any): Promise<StationDedupeReport> {
  const pass1 = await runDedupePass(
    db,
    sql`WHERE btrim(s.istasyon_no) <> ''`,
    sql`btrim(s.istasyon_no)`,
    sql`s.updated_at DESC, s.created_at ASC, s.id`,
  );
  const pass2 = await runDedupePass(
    db,
    sql``,
    sql`md5(lower(btrim(s.name)) || '|' || COALESCE(s.operator_id::text, '0') || '|' || round(s.lat::numeric, 3)::text || '|' || round(s.lon::numeric, 3)::text)`,
    sql`((upper(btrim(s.istasyon_no)) LIKE 'ŞRJ/%' OR upper(btrim(s.istasyon_no)) LIKE 'SRJ/%')) DESC, s.updated_at DESC, s.created_at ASC, s.id`,
  );
  return {
    removed_by_istasyon_no: pass1.deleted,
    removed_by_signature: pass2.deleted,
    reparented_connectors: pass1.connectors + pass2.connectors,
    reparented_reports: pass1.reports + pass2.reports,
    reparented_tariffs: pass1.tariffs + pass2.tariffs,
    removed_total: pass1.deleted + pass2.deleted,
  };
}

/**
 * Doğrulama amaçlı mükerrer istatistiği — temizlik sonrası her iki grup da
 * 0 dönmelidir.
 */
export async function getStationDuplicateStats(
  db: any,
): Promise<{ total: number; dup_istasyon_no_groups: number; dup_signature_groups: number }> {
  const rows = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM "station")::int AS total,
      (SELECT count(*) FROM (
        SELECT btrim(istasyon_no) AS n FROM "station"
        WHERE btrim(istasyon_no) <> ''
        GROUP BY n HAVING count(*) > 1
      ) a)::int AS dup_no_groups,
      (SELECT count(*) FROM (
        SELECT md5(lower(btrim(name)) || '|' || COALESCE(operator_id::text, '0') || '|' ||
                   round(lat::numeric, 3)::text || '|' || round(lon::numeric, 3)::text) AS g
        FROM "station"
        GROUP BY g HAVING count(*) > 1
      ) b)::int AS dup_sig_groups
  `);
  const r0 = (rows && rows[0]) || {};
  return {
    total: Number(r0.total) || 0,
    dup_istasyon_no_groups: Number(r0.dup_no_groups) || 0,
    dup_signature_groups: Number(r0.dup_sig_groups) || 0,
  };
}

/**
 * `istasyon_no` üzerinde UNIQUE kısıt/indeks eksikse (eski prod şeması)
 * temizlik sonrası oluşturur; mevcutsa dokunmaz.
 */
async function ensureStationUniqueIndex(db: any): Promise<void> {
  const existing = await db.execute(sql`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'station'
      AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%istasyon_no%'
  `);
  if (!existing || existing.length === 0) {
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS station_istasyon_no_uidx ON "station" (istasyon_no)`);
  }
}

let dedupeAttempted = false;

/**
 * TALEP-054 self-heal: süreç başına bir kez çalışır. Mükerrerleri temizler,
 * UNIQUE indeksi garanti eder ve sonucu loglar. DB yoksa sessizce geçer;
 * sorgu-tarafı tekilleştirme sayıları yine de doğru tutar.
 */
export async function ensureStationDeduped(): Promise<StationDedupeReport | null> {
  if (dedupeAttempted) return null;
  dedupeAttempted = true;
  try {
    const db = getDb();
    const report = await deduplicateStationTable(db);
    try {
      await ensureStationUniqueIndex(db);
    } catch {
      // UNIQUE indeks oluşturulamadıysa (izin/şema farkı) sorgu-tarafı dedupe devrede kalır
    }
    if (report.removed_total > 0) {
      console.log(
        `[TALEP-054] Mükerrer istasyon temizliği tamamlandı: ${report.removed_total} kayıt silindi ` +
          `(istasyon_no: ${report.removed_by_istasyon_no}, fiziksel imza: ${report.removed_by_signature}); ` +
          `taşınan alt kayıtlar — connector: ${report.reparented_connectors}, ` +
          `report: ${report.reparented_reports}, tariff: ${report.reparented_tariffs}.`,
      );
    }
    return report;
  } catch {
    return null;
  }
}
