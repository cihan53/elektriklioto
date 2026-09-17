
import { toSlug } from '../../utils/unicode.js';

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
