
import { deepLinkService } from '../deeplink/deeplink.service.js';
import { operatorService } from '../operators/operator.service.js';
import { sourceHealthService } from '../worker/source-health.service.js';
import { gadmService } from '../gadm/gadm.service.js';
import { toSlug, foldTurkishCharacters } from '../../utils/unicode.js';
import { validateBBox } from '../../utils/geo.js';
import { BadRequestError } from '../../utils/errors.js';

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

export const stationRepository = {
  stations: new Map<string, StationModel>(),

  initDefaults() {
    this.seed(DEFAULT_STATIONS);
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
    return this.stations.get(normalized) || this.stations.get(slug) || null;
  },

  async findById(id: string): Promise<StationModel | null> {
    return this.stations.get(id) || null;
  },

  async findByIdOrSlug(identifier: string): Promise<StationModel | null> {
    const direct = this.stations.get(identifier);
    if (direct) return direct;
    return this.findBySlug(identifier);
  },

  async findByBBox(minLon: number, minLat: number, maxLon: number, maxLat: number, operatorSlug?: string): Promise<StationModel[]> {
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

  async findByRegion(citySlug?: string, districtSlug?: string, operatorSlug?: string): Promise<StationModel[]> {
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

    const op = operatorService.getById(station.operator_id) || {
      id: station.operator_id,
      name: 'Bilinmeyen Operatör',
      slug: 'bilinmeyen',
      deep_link_config: null,
      is_active: true,
    };

    const deepLink = deepLinkService.generateDeepLink(op.name, station.istasyon_no, op.deep_link_config);

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
      // Faz 1 zorunlu kısıt: NULL veri modeli
      connector_types: null,
      power_kw: null,
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
    // 1. Şehir / İlçe veya Geocode Metni ile Filtreleme
    if (city || district) {
      const stations = await stationRepository.findByRegion(city, district, operatorSlug);
      return stations.map((s) => ({
        id: s.id,
        istasyon_no: s.istasyon_no,
        slug: s.slug,
        name: s.name,
        lat: Number(s.lat),
        lon: Number(s.lon),
        city: s.city,
        district: s.district,
        operator_id: s.operator_id,
        operator_name: operatorService.getById(s.operator_id)?.name || 'Bilinmeyen',
        is_flagged_defective: Boolean(s.is_flagged_defective),
      }));
    }

    if (q && q.trim().length > 0) {
      try {
        const geoResult = gadmService.geocode(q);
        if (geoResult.type === 'neighborhood' || geoResult.type === 'district') {
          const stations = await stationRepository.findByRegion(geoResult.province, geoResult.district || undefined, operatorSlug);
          if (stations.length > 0) {
            return stations.map((s) => ({
              id: s.id,
              istasyon_no: s.istasyon_no,
              slug: s.slug,
              name: s.name,
              lat: Number(s.lat),
              lon: Number(s.lon),
              city: s.city,
              district: s.district,
              operator_id: s.operator_id,
              operator_name: operatorService.getById(s.operator_id)?.name || 'Bilinmeyen',
              is_flagged_defective: Boolean(s.is_flagged_defective),
            }));
          }
        }
      } catch {
        // Geocode bulunamazsa standart akışa devam et
      }
    }

    // 2. Standart BBox Sorgusu
    if (!bboxStr) {
      const unique = new Map<string, StationModel>();
      for (const s of stationRepository.stations.values()) {
        if (operatorSlug) {
          const op = operatorService.getBySlug(operatorSlug);
          if (!op || s.operator_id !== op.id) continue;
        }
        unique.set(s.id, s);
      }

      return Array.from(unique.values()).map((s) => ({
        id: s.id,
        istasyon_no: s.istasyon_no,
        slug: s.slug,
        name: s.name,
        lat: Number(s.lat),
        lon: Number(s.lon),
        city: s.city,
        district: s.district,
        operator_id: s.operator_id,
        operator_name: operatorService.getById(s.operator_id)?.name || 'Bilinmeyen',
        is_flagged_defective: Boolean(s.is_flagged_defective),
      }));
    }

    const parts = bboxStr.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length !== 4 || parts.some((p) => isNaN(p))) {
      throw new BadRequestError('BBox formatı geçersiz. minLon,minLat,maxLon,maxLat beklenmektedir.');
    }

    const [minLon, minLat, maxLon, maxLat] = parts;
    if (!validateBBox(minLon, minLat, maxLon, maxLat)) {
      throw new BadRequestError('BBox sınırları geçersiz veya izin verilen maksimum alan (0.5 derece) aşıldı.');
    }

    const stations = await stationRepository.findByBBox(minLon, minLat, maxLon, maxLat, operatorSlug);

    return stations.map((s) => ({
      id: s.id,
      istasyon_no: s.istasyon_no,
      slug: s.slug,
      name: s.name,
      lat: Number(s.lat),
      lon: Number(s.lon),
      city: s.city,
      district: s.district,
      operator_id: s.operator_id,
      operator_name: operatorService.getById(s.operator_id)?.name || 'Bilinmeyen',
      is_flagged_defective: Boolean(s.is_flagged_defective),
    }));
  }

  /**
   * Harita Arama (GADM CBS Entegrasyonlu)
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

    const qFolded = foldTurkishCharacters(query.trim());
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

    const stations = Array.from(unique.values()).map((s) => ({
      id: s.id,
      istasyon_no: s.istasyon_no,
      slug: s.slug,
      name: s.name,
      lat: Number(s.lat),
      lon: Number(s.lon),
      city: s.city,
      district: s.district,
      operator_id: s.operator_id,
      operator_name: operatorService.getById(s.operator_id)?.name || 'Bilinmeyen',
      is_flagged_defective: Boolean(s.is_flagged_defective),
    }));

    return {
      query,
      matched_region: matchedRegion,
      stations,
    };
  }
}

export const stationService = new StationService();
