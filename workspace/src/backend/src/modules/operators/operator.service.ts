
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, eq, or } from 'drizzle-orm';
import { toSlug } from '../../utils/unicode.js';
import { getDb } from '../../db/index.js';
import { operators } from '../../db/schema/operators.js';

export interface OperatorDto {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
  station_count?: number;
  deep_link_config?: {
    scheme?: string;
    android_package?: string;
    ios_app_store_id?: string;
    clipboard_fallback?: boolean;
  } | null;
}

const DEFAULT_OPERATORS: OperatorDto[] = [
  { id: 1, slug: 'zes', name: 'ZES', is_active: true, station_count: 1940, deep_link_config: { scheme: 'zes://station/{station_code}' } },
  { id: 2, slug: 'trugo', name: 'Trugo', is_active: true, station_count: 1376, deep_link_config: { scheme: 'trugo://charge?station={station_code}' } },
  { id: 3, slug: 'esarj', name: 'Eşarj', is_active: true, station_count: 763, deep_link_config: { scheme: 'esarj://station/{station_code}' } },
  { id: 4, slug: 'voltrun', name: 'Voltrun', is_active: true, station_count: 1147, deep_link_config: null },
  { id: 5, slug: 'sharznet', name: 'Sharz.net', is_active: true, station_count: 200, deep_link_config: null },
];

export class OperatorService {
  private operators: OperatorDto[] = [...DEFAULT_OPERATORS];

  constructor() {
    this.loadFromDataFile();
    this.syncWithDb().catch(() => {});
  }

  public loadFromDataFile(): void {
    const candidatePaths: string[] = [];
    try {
      const here = path.dirname(fileURLToPath(import.meta.url));
      candidatePaths.push(path.resolve(here, '../../data/operators.json'));
      candidatePaths.push(path.resolve(here, '../../../src/data/operators.json'));
      candidatePaths.push(path.resolve(here, '../../../../workspace/src/backend/src/data/operators.json'));
    } catch {}
    candidatePaths.push(
      path.resolve(process.cwd(), 'src/data/operators.json'),
      path.resolve(process.cwd(), 'workspace/src/backend/src/data/operators.json'),
      path.resolve(process.cwd(), 'data/operators.json'),
      path.resolve(process.cwd(), '../data/operators.json'),
      path.resolve(process.cwd(), '../../data/operators.json'),
      path.resolve(process.cwd(), 'workspace/data/operators.json'),
    );

    for (const cp of candidatePaths) {
      if (fs.existsSync(cp)) {
        try {
          const raw = fs.readFileSync(cp, 'utf-8');
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            this.operators = list;
            console.log(`[operatorService] ${list.length} operatör hafızaya yüklendi.`);
            break;
          }
        } catch {}
      }
    }
  }

  public async syncWithDb(): Promise<void> {
    try {
      const db = getDb();
      const rows = await db.select().from(operators);
      const opMap = new Map<number, OperatorDto>();

      // Önce hafızadaki operatörleri omurga olarak ekle (veri kaybı ve eksik operatör önleme)
      for (const op of this.operators) {
        opMap.set(op.id, op);
      }
      // Veritabanındaki güncel kayıtlarla zenginleştir
      if (rows && rows.length > 0) {
        for (const r of rows) {
          const existing = opMap.get(r.id);
          opMap.set(r.id, {
            id: r.id,
            slug: r.slug,
            name: r.name,
            is_active: r.is_active,
            station_count: existing?.station_count,
            deep_link_config: (r.deep_link_config as any) ?? existing?.deep_link_config ?? null,
          });
        }
      }

      this.operators = Array.from(opMap.values());

      // Veritabanında eksik operatör varsa (örn. sadece default 5 operatör varsa), 179 operatörü DB'ye tamamla
      if (rows && rows.length < 170 && this.operators.length >= 170) {
        for (const op of this.operators) {
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
      }
    } catch {}
  }

  /**
   * TALEP-065: Operatör listesini merkezi veritabanından dinamik olarak çeker.
   * Canlı istasyon sayılarını hesaplar ve güncel deep_link_config ile döndürür.
   */
  public async getAll(): Promise<OperatorDto[]> {
    try {
      const db = getDb();
      const rows = await db.select().from(operators);
      if (rows && rows.length > 0) {
        const stationCounts = new Map<number, number>();
        try {
          const counts = await db.execute<{ operator_id: number; count: string }>(
            sql`SELECT operator_id, count(*)::text as count FROM "station" GROUP BY operator_id`
          );
          if (counts && counts.length > 0) {
            for (const c of counts) {
              stationCounts.set(Number(c.operator_id), Number(c.count));
            }
          }
        } catch {}

        const dbOps: OperatorDto[] = rows.map((r) => {
          const cached = this.operators.find((o) => o.id === r.id);
          const liveCount = stationCounts.get(r.id);
          return {
            id: r.id,
            slug: r.slug,
            name: r.name,
            is_active: r.is_active,
            station_count: liveCount !== undefined ? liveCount : cached?.station_count,
            deep_link_config: (r.deep_link_config as any) ?? cached?.deep_link_config ?? null,
          };
        });

        this.operators = dbOps;
        return dbOps;
      }
    } catch {
      // Veritabanı erişilemezse bellek içi fallback
    }
    return this.operators;
  }

  public getAllSync(): OperatorDto[] {
    return this.operators;
  }

  /**
   * TALEP-065: Slug ile operatörü doğrudan veritabanından sorgular.
   */
  public async getBySlug(slug: string): Promise<OperatorDto | null> {
    const normalized = toSlug(slug);
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(operators)
        .where(or(eq(operators.slug, slug), eq(operators.slug, normalized)))
        .limit(1);

      if (rows && rows.length > 0) {
        const r = rows[0];
        let stCount: number | undefined = undefined;
        try {
          const countRes = await db.execute<{ count: string }>(
            sql`SELECT count(*)::text as count FROM "station" WHERE operator_id = ${r.id}`
          );
          stCount = Number(countRes[0]?.count || 0);
        } catch {}

        const cached = this.operators.find((o) => o.id === r.id);
        const dto: OperatorDto = {
          id: r.id,
          slug: r.slug,
          name: r.name,
          is_active: r.is_active,
          station_count: stCount !== undefined ? stCount : cached?.station_count,
          deep_link_config: (r.deep_link_config as any) ?? cached?.deep_link_config ?? null,
        };
        const idx = this.operators.findIndex((o) => o.id === r.id);
        if (idx >= 0) this.operators[idx] = dto;
        else this.operators.push(dto);
        return dto;
      }
    } catch {}

    return this.operators.find((op) => op.slug === normalized || op.slug === slug) || null;
  }

  public getBySlugSync(slug: string): OperatorDto | null {
    const normalized = toSlug(slug);
    return this.operators.find((op) => op.slug === normalized || op.slug === slug) || null;
  }

  /**
   * TALEP-065: ID ile operatörü doğrudan veritabanından sorgular.
   */
  public async getByIdAsync(id: number): Promise<OperatorDto | null> {
    try {
      const db = getDb();
      const rows = await db.select().from(operators).where(eq(operators.id, id)).limit(1);
      if (rows && rows.length > 0) {
        const r = rows[0];
        const cached = this.operators.find((o) => o.id === r.id);
        const dto: OperatorDto = {
          id: r.id,
          slug: r.slug,
          name: r.name,
          is_active: r.is_active,
          station_count: cached?.station_count,
          deep_link_config: (r.deep_link_config as any) ?? cached?.deep_link_config ?? null,
        };
        const idx = this.operators.findIndex((o) => o.id === r.id);
        if (idx >= 0) this.operators[idx] = dto;
        else this.operators.push(dto);
        return dto;
      }
    } catch {}
    return this.getById(id);
  }

  public getById(id: number): OperatorDto | null {
    return this.operators.find((op) => op.id === id) || null;
  }
}

export const operatorService = new OperatorService();
