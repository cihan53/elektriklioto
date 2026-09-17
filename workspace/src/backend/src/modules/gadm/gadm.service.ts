
import { TUR_PROVINCES, TUR_DISTRICTS, TUR_NEIGHBORHOODS } from './gadm.data.js';
import {
  GadmProvince,
  GadmDistrict,
  GadmNeighborhood,
  GeocodeResult,
  ReverseGeocodeResult,
  GadmSearchResult,
} from './gadm.types.js';
import { foldTurkishCharacters, toSlug } from '../../utils/unicode.js';
import { isWithinTurkeyBounds, haversineDistanceMeters } from '../../utils/geo.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export class GadmService {
  private provinces: GadmProvince[] = [...TUR_PROVINCES];
  private districts: GadmDistrict[] = [...TUR_DISTRICTS];
  private neighborhoods: GadmNeighborhood[] = [...TUR_NEIGHBORHOODS];

  private provincesBySlug = new Map<string, GadmProvince>();
  private districtsBySlug = new Map<string, GadmDistrict>();
  private districtsByProvince = new Map<string, GadmDistrict[]>();
  private neighborhoodsByDistrict = new Map<string, GadmNeighborhood[]>();

  constructor() {
    this.initIndexes();
  }

  private initIndexes(): void {
    for (const p of this.provinces) {
      this.provincesBySlug.set(p.slug, p);
      this.provincesBySlug.set(toSlug(p.name), p);
    }

    for (const d of this.districts) {
      this.districtsBySlug.set(d.slug, d);
      this.districtsBySlug.set(`${d.province_slug}-${d.slug}`, d);
      this.districtsBySlug.set(toSlug(d.name), d);

      const list = this.districtsByProvince.get(d.province_slug) || [];
      list.push(d);
      this.districtsByProvince.set(d.province_slug, list);
    }

    for (const n of this.neighborhoods) {
      const list = this.neighborhoodsByDistrict.get(n.district_slug) || [];
      list.push(n);
      this.neighborhoodsByDistrict.set(n.district_slug, list);
    }
  }

  public getAllProvinces(): GadmProvince[] {
    return this.provinces;
  }

  public getProvinceBySlug(slug: string): GadmProvince | null {
    const normalized = toSlug(slug);
    return this.provincesBySlug.get(normalized) || null;
  }

  public getDistricts(provinceSlug?: string, query?: string): GadmDistrict[] {
    let result: GadmDistrict[];
    if (provinceSlug) {
      const normProv = toSlug(provinceSlug);
      result = this.districtsByProvince.get(normProv) || [];
    } else {
      result = this.districts;
    }

    if (query && query.trim()) {
      const qFolded = foldTurkishCharacters(query.trim());
      result = result.filter(
        (d) =>
          foldTurkishCharacters(d.name).includes(qFolded) ||
          d.slug.includes(qFolded) ||
          foldTurkishCharacters(d.province_name).includes(qFolded)
      );
    }

    return result;
  }

  public getDistrictBySlug(districtSlug: string, provinceSlug?: string): GadmDistrict | null {
    const normDistrict = toSlug(districtSlug);
    if (provinceSlug) {
      const normProv = toSlug(provinceSlug);
      const composite = this.districtsBySlug.get(`${normProv}-${normDistrict}`);
      if (composite) return composite;
    }
    return this.districtsBySlug.get(normDistrict) || null;
  }

  public getNeighborhoods(districtSlug: string): GadmNeighborhood[] {
    const normDistrict = toSlug(districtSlug);
    return this.neighborhoodsByDistrict.get(normDistrict) || [];
  }

  public getNeighborhoodBySlug(districtSlug: string, neighborhoodSlug: string): GadmNeighborhood | null {
    const list = this.getNeighborhoods(districtSlug);
    const normNeigh = toSlug(neighborhoodSlug);
    return list.find((n) => n.slug === normNeigh || toSlug(n.name) === normNeigh) || null;
  }

  /**
   * Harita Arama & Otomatik Tamamlama (GADM CBS Endeksi)
   */
  public search(query: string, limit = 10): GadmSearchResult[] {
    if (!query || query.trim().length === 0) return [];

    const qFolded = foldTurkishCharacters(query.trim());
    const results: GadmSearchResult[] = [];

    // 1. İller
    for (const p of this.provinces) {
      const pFolded = foldTurkishCharacters(p.name);
      if (pFolded.startsWith(qFolded) || p.slug.startsWith(qFolded) || pFolded.includes(qFolded)) {
        results.push({
          type: 'province',
          name: p.name,
          display_name: `${p.name} (İl)`,
          slug: p.slug,
          province_name: p.name,
          coordinates: p.center,
          bbox: p.bbox,
        });
      }
    }

    // 2. İlçeler
    for (const d of this.districts) {
      const dFolded = foldTurkishCharacters(d.name);
      if (dFolded.startsWith(qFolded) || d.slug.startsWith(qFolded) || dFolded.includes(qFolded)) {
        results.push({
          type: 'district',
          name: d.name,
          display_name: `${d.name}, ${d.province_name}`,
          slug: d.slug,
          province_name: d.province_name,
          district_name: d.name,
          coordinates: d.center,
          bbox: d.bbox,
        });
      }
    }

    // 3. Mahalleler
    for (const n of this.neighborhoods) {
      const nFolded = foldTurkishCharacters(n.name);
      if (nFolded.startsWith(qFolded) || n.slug.startsWith(qFolded) || nFolded.includes(qFolded)) {
        const dist = this.districtsBySlug.get(n.district_slug);
        const provName = dist ? dist.province_name : n.province_slug;
        const distName = dist ? dist.name : n.district_slug;
        results.push({
          type: 'neighborhood',
          name: n.name,
          display_name: `${n.name} Mah., ${distName}, ${provName}`,
          slug: n.slug,
          province_name: provName,
          district_name: distName,
          coordinates: n.center,
          bbox: n.bbox,
        });
      }
    }

    // Öncelik Sıralaması: Tam eşleşenler > Başlayanlar > İçerenler
    results.sort((a, b) => {
      const aNameFolded = foldTurkishCharacters(a.name);
      const bNameFolded = foldTurkishCharacters(b.name);
      const aExact = aNameFolded === qFolded ? 0 : 1;
      const bExact = bNameFolded === qFolded ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      const aStarts = aNameFolded.startsWith(qFolded) ? 0 : 1;
      const bStarts = bNameFolded.startsWith(qFolded) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;

      return a.name.localeCompare(b.name, 'tr');
    });

    return results.slice(0, Math.min(limit, 50));
  }

  /**
   * Geocoding (Metin / Adres -> Koordinat & Sınır Kutusu)
   */
  public geocode(query: string): GeocodeResult {
    if (!query || query.trim().length === 0) {
      throw new BadRequestError('Geocoding için arama terimi zorunludur.', 'INVALID_GEOCODE_QUERY');
    }

    const clean = query.trim();
    const cleanFolded = foldTurkishCharacters(clean);

    // 1. Mahalle tespiti (Örn: "Caferağa Mah.", "Moda", "Sinanpaşa")
    for (const n of this.neighborhoods) {
      const nFolded = foldTurkishCharacters(n.name);
      if (
        cleanFolded.includes(nFolded) ||
        cleanFolded.includes(n.slug) ||
        (n.name.length >= 4 && cleanFolded.includes(nFolded))
      ) {
        const dist = this.districtsBySlug.get(n.district_slug);
        const provName = dist ? dist.province_name : 'İstanbul';
        const distName = dist ? dist.name : 'Kadıköy';
        return {
          query: clean,
          type: 'neighborhood',
          name: n.name,
          display_name: `${n.name} Mah., ${distName}, ${provName}`,
          province: provName,
          district: distName,
          neighborhood: n.name,
          coordinates: n.center,
          bbox: n.bbox,
          gadm_id: n.gid,
          confidence: 0.95,
        };
      }
    }

    // 2. İlçe tespiti (Örn: "Kadıköy", "Çankaya", "Bodrum")
    for (const d of this.districts) {
      const dFolded = foldTurkishCharacters(d.name);
      if (
        cleanFolded === dFolded ||
        cleanFolded.startsWith(`${dFolded} `) ||
        cleanFolded.endsWith(` ${dFolded}`) ||
        cleanFolded.includes(`${dFolded},`) ||
        cleanFolded.includes(`${dFolded}/`) ||
        cleanFolded === d.slug
      ) {
        return {
          query: clean,
          type: 'district',
          name: d.name,
          display_name: `${d.name}, ${d.province_name}`,
          province: d.province_name,
          district: d.name,
          neighborhood: null,
          coordinates: d.center,
          bbox: d.bbox,
          gadm_id: d.gid,
          confidence: 0.9,
        };
      }
    }

    // 3. İl tespiti (Örn: "İstanbul", "Ankara", "İzmir", "Bolu")
    for (const p of this.provinces) {
      const pFolded = foldTurkishCharacters(p.name);
      if (
        cleanFolded === pFolded ||
        cleanFolded.startsWith(`${pFolded} `) ||
        cleanFolded.endsWith(` ${pFolded}`) ||
        cleanFolded.includes(`${pFolded},`) ||
        cleanFolded === p.slug
      ) {
        return {
          query: clean,
          type: 'province',
          name: p.name,
          display_name: `${p.name}, Türkiye`,
          province: p.name,
          district: null,
          neighborhood: null,
          coordinates: p.center,
          bbox: p.bbox,
          gadm_id: p.gid,
          confidence: 0.85,
        };
      }
    }

    // 4. Parçalı arama (Substring fallback)
    const searchMatches = this.search(clean, 1);
    if (searchMatches.length > 0) {
      const match = searchMatches[0];
      return {
        query: clean,
        type: match.type,
        name: match.name,
        display_name: match.display_name,
        province: match.province_name,
        district: match.district_name || null,
        neighborhood: match.type === 'neighborhood' ? match.name : null,
        coordinates: match.coordinates,
        bbox: match.bbox,
        gadm_id: `TUR.${match.slug}`,
        confidence: 0.75,
      };
    }

    throw new NotFoundError(`Adres veya bölge bulunamadı: ${clean}`, 'GEOCODE_NOT_FOUND');
  }

  /**
   * Reverse Geocoding (Koordinat -> Resmi İl, İlçe, Mahalle)
   */
  public reverseGeocode(lat: number, lon: number): ReverseGeocodeResult {
    if (!isWithinTurkeyBounds(lat, lon)) {
      throw new BadRequestError('Koordinatlar Türkiye sınırları (WGS84) dışındadır.', 'OUT_OF_TURKEY_BOUNDS');
    }

    // 1. En yakın il
    let closestProvince = this.provinces[0];
    let minProvinceDist = Infinity;

    for (const p of this.provinces) {
      if (lon >= p.bbox.min_lon && lon <= p.bbox.max_lon && lat >= p.bbox.min_lat && lat <= p.bbox.max_lat) {
        closestProvince = p;
        break;
      }
      const dist = haversineDistanceMeters(lat, lon, p.center.lat, p.center.lon);
      if (dist < minProvinceDist) {
        minProvinceDist = dist;
        closestProvince = p;
      }
    }

    // 2. İle bağlı veya en yakın ilçe
    const candidateDistricts = this.districtsByProvince.get(closestProvince.slug) || this.districts;
    let closestDistrict = candidateDistricts[0];
    let minDistrictDist = Infinity;

    for (const d of candidateDistricts) {
      const dist = haversineDistanceMeters(lat, lon, d.center.lat, d.center.lon);
      if (dist < minDistrictDist) {
        minDistrictDist = dist;
        closestDistrict = d;
      }
    }

    // 3. İlçeye bağlı veya en yakın mahalle
    const candidateNeighborhoods = this.neighborhoodsByDistrict.get(closestDistrict.slug) || [];
    let closestNeighborhood: GadmNeighborhood | null = null;
    let minNeighborhoodDist = Infinity;

    for (const n of candidateNeighborhoods) {
      const dist = haversineDistanceMeters(lat, lon, n.center.lat, n.center.lon);
      if (dist < minNeighborhoodDist) {
        minNeighborhoodDist = dist;
        closestNeighborhood = n;
      }
    }

    const nName = closestNeighborhood && minNeighborhoodDist <= 3500 ? closestNeighborhood.name : null;
    const nSlug = closestNeighborhood && minNeighborhoodDist <= 3500 ? closestNeighborhood.slug : null;

    let formattedAddress: string;
    if (nName) {
      formattedAddress = `${nName} Mah., ${closestDistrict.name}, ${closestProvince.name}`;
    } else {
      formattedAddress = `${closestDistrict.name}, ${closestProvince.name}`;
    }

    return {
      coordinates: { lat, lon },
      province: closestProvince.name,
      province_slug: closestProvince.slug,
      district: closestDistrict.name,
      district_slug: closestDistrict.slug,
      neighborhood: nName,
      neighborhood_slug: nSlug,
      formatted_address: formattedAddress,
      distance_meters: Math.round(nName ? minNeighborhoodDist : minDistrictDist),
      gadm_id: closestDistrict.gid,
    };
  }
}

export const gadmService = new GadmService();
