/**
 * TALEP-İLÇE (Issue #56): İl / İlçe kanonik kod tabanı.
 *
 * Tek doğruluk kaynağı: src/data/turkey_regions.json (GADM 4.1, 81 il + 929 ilçe).
 * Gid formatı "TUR.<plaka>.<ilce_no>_1" olduğundan ilçe kodu = plaka * 1000 + ilce_no
 * şeklinde deterministik üretilir.
 *
 * Sorgular isim yerine bu kodlarla yapılır; metin değerler yalnızca görüntü içindir.
 * Böylece ASCII/Unicode varyantları ("Istanbul" vs "İstanbul") veri bütünlüğünü bozamaz.
 */

import fs from 'node:fs';
import path from 'node:path';
import { foldTurkishCharacters, toSlug } from '../../utils/unicode.js';
import { haversineDistanceMeters } from '../../utils/geo.js';

interface RegionRow {
  level: number;
  name: string;
  parent_name: string | null;
  gid: string;
  center_lat: number;
  center_lon: number;
  min_lat: number;
  min_lon: number;
  max_lat: number;
  max_lon: number;
}

export interface ProvinceRef {
  code: number;
  name: string;
  slug: string;
}

export interface DistrictRef {
  code: number;
  ilKodu: number;
  name: string;
  slug: string;
}

// GADM 4.1 eski resmi isimleri taşır; görüntüde güncel resmi ad kullanılır.
// Eşleştirme her iki forma da izin verir (eski ad alias olarak tutulur).
const DISTRICT_DISPLAY_OVERRIDES: Record<string, string> = {
  '6|Sultan Kochisar': 'Şereflikoçhisar',
  '6|Kazan': 'Kahramankazan',
};

const DISTRICT_MATCH_ALIASES: Record<string, string> = {
  'sereflikochisar': 'sultan kochisar',
  'kahramankazan': 'kazan',
};

function regionDataPaths(): string[] {
  return [
    path.resolve(process.cwd(), 'src/data/turkey_regions.json'),
    path.resolve(process.cwd(), 'workspace/src/backend/src/data/turkey_regions.json'),
    path.resolve(process.cwd(), '../data/turkey_regions.json'),
    path.resolve(process.cwd(), 'server-scripts/turkey_regions.json'),
    path.resolve(process.cwd(), 'workspace/server-scripts/turkey_regions.json'),
  ];
}

class RegionLookup {
  private provinces = new Map<number, ProvinceRef>();
  private provinceByFolded = new Map<string, number>();
  private districts = new Map<number, DistrictRef>();
  private districtByProvinceFolded = new Map<string, number>();
  private districtByFoldedGlobal = new Map<string, number>();
  private provinceGeo: Array<{ code: number; lat: number; lon: number; minLat: number; minLon: number; maxLat: number; maxLon: number }> = [];
  private districtGeo = new Map<number, Array<{ code: number; lat: number; lon: number }>>();
  public readonly loaded: boolean;

  constructor() {
    this.loaded = this.load();
  }

  private load(): boolean {
    for (const p of regionDataPaths()) {
      try {
        if (!fs.existsSync(p)) continue;
        const rows = JSON.parse(fs.readFileSync(p, 'utf-8')) as RegionRow[];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        const provinceCodeByName = new Map<string, number>();
        for (const r of rows) {
          if (r.level !== 1) continue;
          const m = /^TUR\.(\d+)_1$/.exec(r.gid);
          if (!m) continue;
          const code = Number(m[1]);
          const ref: ProvinceRef = { code, name: r.name, slug: toSlug(r.name) };
          this.provinces.set(code, ref);
          this.provinceByFolded.set(foldTurkishCharacters(r.name), code);
          this.provinceByFolded.set(ref.slug, code);
          provinceCodeByName.set(r.name, code);
          this.provinceGeo.push({
            code, lat: r.center_lat, lon: r.center_lon,
            minLat: r.min_lat, minLon: r.min_lon, maxLat: r.max_lat, maxLon: r.max_lon,
          });
        }

        for (const r of rows) {
          if (r.level !== 2 || !r.parent_name) continue;
          const ilKodu = provinceCodeByName.get(r.parent_name);
          const m = /^TUR\.(\d+)\.(\d+)_1$/.exec(r.gid);
          if (!ilKodu || !m || Number(m[1]) !== ilKodu) continue;
          const code = ilKodu * 1000 + Number(m[2]);
          const displayName = DISTRICT_DISPLAY_OVERRIDES[`${ilKodu}|${r.name}`] || r.name;
          const ref: DistrictRef = { code, ilKodu, name: displayName, slug: toSlug(displayName) };
          this.districts.set(code, ref);
          this.districtByProvinceFolded.set(`${ilKodu}|${foldTurkishCharacters(r.name)}`, code);
          this.districtByProvinceFolded.set(`${ilKodu}|${toSlug(r.name)}`, code);
          if (displayName !== r.name) {
            this.districtByProvinceFolded.set(`${ilKodu}|${foldTurkishCharacters(displayName)}`, code);
            this.districtByProvinceFolded.set(`${ilKodu}|${ref.slug}`, code);
          }
          const alias = DISTRICT_MATCH_ALIASES[foldTurkishCharacters(displayName)];
          if (alias) this.districtByProvinceFolded.set(`${ilKodu}|${alias}`, code);
          if (!this.districtByFoldedGlobal.has(foldTurkishCharacters(displayName))) {
            this.districtByFoldedGlobal.set(foldTurkishCharacters(displayName), code);
          }
          const list = this.districtGeo.get(ilKodu) || [];
          list.push({ code, lat: r.center_lat, lon: r.center_lon });
          this.districtGeo.set(ilKodu, list);
        }

        if (this.provinces.size >= 81 && this.districts.size >= 900) {
          return true;
        }
      } catch {
        // bir sonraki aday yolu dene
      }
    }
    return this.provinces.size > 0;
  }

  /** Serbest metni (isim, slug, ASCII varyant) il plaka koduna çevirir. */
  public resolveProvinceCode(text?: string | null): number | null {
    const folded = foldTurkishCharacters(String(text || '').trim());
    if (!folded) return null;
    return this.provinceByFolded.get(folded) ?? null;
  }

  /**
   * İlçe metnini ilçe koduna çevirir.
   * ilKodu verilirse o ilin ilçeleri içinde aranır; verilmezse genel arama yapılır
   * (aynı isimde birden çok ilçe olabilir — ilk bulunan döner).
   */
  public resolveIlceCode(ilKodu: number | null, text?: string | null): number | null {
    const folded = foldTurkishCharacters(String(text || '').trim());
    if (!folded) return null;
    if (ilKodu) {
      return this.districtByProvinceFolded.get(`${ilKodu}|${folded}`) ?? null;
    }
    return this.districtByFoldedGlobal.get(folded) ?? null;
  }

  public provinceName(code?: number | null): string | null {
    return (code && this.provinces.get(code)?.name) || null;
  }

  public districtName(code?: number | null): string | null {
    return (code && this.districts.get(code)?.name) || null;
  }

  public provinceCodeFromCoords(lat: number, lon: number): number | null {
    let best: number | null = null;
    let bestDist = Infinity;
    for (const p of this.provinceGeo) {
      if (lon >= p.minLon && lon <= p.maxLon && lat >= p.minLat && lat <= p.maxLat) {
        const d = haversineDistanceMeters(lat, lon, p.lat, p.lon);
        if (d < bestDist) {
          bestDist = d;
          best = p.code;
        }
      }
    }
    if (best !== null) return best;
    for (const p of this.provinceGeo) {
      const d = haversineDistanceMeters(lat, lon, p.lat, p.lon);
      if (d < bestDist) {
        bestDist = d;
        best = p.code;
      }
    }
    return best;
  }

  public ilceCodeFromCoords(ilKodu: number | null, lat: number, lon: number): number | null {
    const candidates = (ilKodu && this.districtGeo.get(ilKodu)) || [];
    let best: number | null = null;
    let bestDist = Infinity;
    for (const d of candidates) {
      const dist = haversineDistanceMeters(lat, lon, d.lat, d.lon);
      if (dist < bestDist) {
        bestDist = dist;
        best = d.code;
      }
    }
    return best;
  }

  public allProvinces(): ProvinceRef[] {
    return [...this.provinces.values()];
  }

  public allDistricts(): DistrictRef[] {
    return [...this.districts.values()];
  }
}

export const regionLookup = new RegionLookup();
