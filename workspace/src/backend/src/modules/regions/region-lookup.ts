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

/**
 * Kanonik il adı -> plaka kodu. GADM gid indeksi plaka kodu DEĞİLDİR
 * (Ankara gid=TUR.7, plaka=06) — plaka her zaman isim üzerinden çözülür.
 */
const PLAKA_TO_IL: Record<number, string> = {
  1: 'Adana', 2: 'Adıyaman', 3: 'Afyonkarahisar', 4: 'Ağrı', 5: 'Amasya',
  6: 'Ankara', 7: 'Antalya', 8: 'Artvin', 9: 'Aydın', 10: 'Balıkesir',
  11: 'Bilecik', 12: 'Bingöl', 13: 'Bitlis', 14: 'Bolu', 15: 'Burdur',
  16: 'Bursa', 17: 'Çanakkale', 18: 'Çankırı', 19: 'Çorum', 20: 'Denizli',
  21: 'Diyarbakır', 22: 'Edirne', 23: 'Elazığ', 24: 'Erzincan', 25: 'Erzurum',
  26: 'Eskişehir', 27: 'Gaziantep', 28: 'Giresun', 29: 'Gümüşhane', 30: 'Hakkari',
  31: 'Hatay', 32: 'Isparta', 33: 'Mersin', 34: 'İstanbul', 35: 'İzmir',
  36: 'Kars', 37: 'Kastamonu', 38: 'Kayseri', 39: 'Kırklareli', 40: 'Kırşehir',
  41: 'Kocaeli', 42: 'Konya', 43: 'Kütahya', 44: 'Malatya', 45: 'Manisa',
  46: 'Kahramanmaraş', 47: 'Mardin', 48: 'Muğla', 49: 'Muş', 50: 'Nevşehir',
  51: 'Niğde', 52: 'Ordu', 53: 'Rize', 54: 'Sakarya', 55: 'Samsun',
  56: 'Siirt', 57: 'Sinop', 58: 'Sivas', 59: 'Tekirdağ', 60: 'Tokat',
  61: 'Trabzon', 62: 'Tunceli', 63: 'Şanlıurfa', 64: 'Uşak', 65: 'Van',
  66: 'Yozgat', 67: 'Zonguldak', 68: 'Aksaray', 69: 'Bayburt', 70: 'Karaman',
  71: 'Kırıkkale', 72: 'Batman', 73: 'Şırnak', 74: 'Bartın', 75: 'Ardahan',
  76: 'Iğdır', 77: 'Yalova', 78: 'Karabük', 79: 'Kilis', 80: 'Osmaniye',
  81: 'Düzce',
};

const NAME_FOLD_TO_PLAKA = new Map<string, number>();
for (const [code, name] of Object.entries(PLAKA_TO_IL)) {
  for (const v of [name, name.toLowerCase(), name.toUpperCase(), toSlug(name)]) {
    NAME_FOLD_TO_PLAKA.set(foldTurkishCharacters(v), Number(code));
  }
}
// GADM 4.1 kaynak adlarindaki ASCII bozukluklari icin alias
NAME_FOLD_TO_PLAKA.set('hakkâri', 30);
NAME_FOLD_TO_PLAKA.set('kinkkale', 71);
NAME_FOLD_TO_PLAKA.set('zinguldak', 67);

// GADM 4.1 eski resmi isimleri taşır; görüntüde güncel resmi ad kullanılır.
// Eşleştirme her iki forma da izin verir (eski ad alias olarak tutulur).
const DISTRICT_DISPLAY_OVERRIDES: Record<string, string> = {
  '6|Şultan Koçhisar': 'Şereflikoçhisar',
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
          const code = NAME_FOLD_TO_PLAKA.get(foldTurkishCharacters(r.name));
          if (!code) continue;
          const canonicalName = PLAKA_TO_IL[code] || r.name;
          const ref: ProvinceRef = { code, name: canonicalName, slug: toSlug(canonicalName) };
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
          if (!ilKodu || !m) continue;
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
