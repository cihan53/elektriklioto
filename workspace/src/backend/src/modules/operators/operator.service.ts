
import fs from 'fs';
import path from 'path';
import { toSlug } from '../../utils/unicode.js';
import { getDb } from '../../db/index.js';
import { operators } from '../../db/schema/operators.js';

export interface OperatorDto {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
  deep_link_config?: {
    scheme?: string;
    android_package?: string;
    ios_app_store_id?: string;
    clipboard_fallback?: boolean;
  } | null;
}

const DEFAULT_OPERATORS: OperatorDto[] = [
  { id: 1, slug: 'zes', name: 'ZES', is_active: true, deep_link_config: { scheme: 'zes://station/{station_code}' } },
  { id: 2, slug: 'trugo', name: 'Trugo', is_active: true, deep_link_config: { scheme: 'trugo://charge?station={station_code}' } },
  { id: 3, slug: 'esarj', name: 'Eşarj', is_active: true, deep_link_config: { scheme: 'esarj://station/{station_code}' } },
  { id: 4, slug: 'voltrun', name: 'Voltrun', is_active: true, deep_link_config: null },
  { id: 5, slug: 'sharznet', name: 'Sharz.net', is_active: true, deep_link_config: null },
];

export class OperatorService {
  private operators: OperatorDto[] = [...DEFAULT_OPERATORS];

  constructor() {
    this.loadFromDataFile();
    this.syncWithDb().catch(() => {});
  }

  public loadFromDataFile(): void {
    const candidatePaths = [
      path.resolve(process.cwd(), 'src/data/operators.json'),
      path.resolve(process.cwd(), 'workspace/src/backend/src/data/operators.json'),
      path.resolve(process.cwd(), '../data/operators.json'),
      '/Users/cihan/PROJECT/elektriklioto-gemini/workspace/src/backend/src/data/operators.json',
    ];

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
      if (rows && rows.length > 0) {
        const opMap = new Map<number, OperatorDto>();
        for (const def of DEFAULT_OPERATORS) {
          opMap.set(def.id, def);
        }
        for (const r of rows) {
          opMap.set(r.id, {
            id: r.id,
            slug: r.slug,
            name: r.name,
            is_active: r.is_active,
            deep_link_config: r.deep_link_config as any,
          });
        }
        this.operators = Array.from(opMap.values());
      }
    } catch {}
  }

  public getAll(): OperatorDto[] {
    return this.operators;
  }

  public getBySlug(slug: string): OperatorDto | null {
    const normalized = toSlug(slug);
    return this.operators.find((op) => op.slug === normalized) || null;
  }

  public getById(id: number): OperatorDto | null {
    return this.operators.find((op) => op.id === id) || null;
  }
}

export const operatorService = new OperatorService();
