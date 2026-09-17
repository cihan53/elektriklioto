
import type { StationItem } from './station';

export interface FilterState {
  operatorSlug: string;
  isPublicOnly: boolean;
  searchQuery: string;
  selectedStation: StationItem | null;
}
