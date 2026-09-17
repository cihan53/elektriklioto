
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { stationService } from './station.service.js';
import {
  StationDetailResponseSchema,
  StationSummarySchema,
  StationQuerySchema,
  StationSearchResponseSchema,
} from './station.schema.js';
import { gadmService } from '../gadm/gadm.service.js';
import {
  ProvinceListResponseSchema,
  DistrictListResponseSchema,
  GeocodeResultSchema,
  ReverseGeocodeResultSchema,
} from '../gadm/gadm.schema.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const stationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // 1. Harita Arama (GADM CBS Entegrasyonlu İstasyon Arama)
  app.get(
    '/search',
    {
      schema: {
        description: 'GADM resmi il/ilçe/mahalle sınırları ve şarj istasyonları üzerinde akıllı arama yapar.',
        tags: ['Stations', 'GADM'],
        querystring: Type.Object({
          q: Type.String({ minLength: 1 }),
        }),
        response: {
          200: StationSearchResponseSchema,
        },
      },
    },
    async (request) => {
      const { q } = request.query;
      return stationService.searchStations(q);
    }
  );

  // 2. Geocoding (GADM 4.1 Resmi CBS)
  app.get(
    '/geocode',
    {
      schema: {
        description: 'Adres veya konum metnini GADM 4.1 resmi CBS koordinatlarına ve sınır kutusuna çözümler.',
        tags: ['Stations', 'GADM'],
        querystring: Type.Object({
          q: Type.Optional(Type.String()),
          address: Type.Optional(Type.String()),
        }),
        response: {
          200: GeocodeResultSchema,
        },
      },
    },
    async (request) => {
      const query = request.query.q || request.query.address;
      if (!query) {
        throw new BadRequestError('Geocoding için `q` veya `address` parametresi zorunludur.', 'MISSING_QUERY');
      }
      return gadmService.geocode(query);
    }
  );

  // 3. Reverse Geocoding (GADM 4.1 Resmi CBS)
  app.get(
    '/reverse-geocode',
    {
      schema: {
        description: 'Koordinatların ait olduğu resmi il, ilçe ve mahalleyi GADM veritabanından döner.',
        tags: ['Stations', 'GADM'],
        querystring: Type.Object({
          lat: Type.Number(),
          lon: Type.Number(),
        }),
        response: {
          200: ReverseGeocodeResultSchema,
        },
      },
    },
    async (request) => {
      const { lat, lon } = request.query;
      return gadmService.reverseGeocode(lat, lon);
    }
  );

  // 4. Resmi İller Listesi (GADM 4.1 Level 1)
  app.get(
    '/regions/provinces',
    {
      schema: {
        description: 'Türkiye 81 ilinin resmi GADM CBS sınır ve merkez koordinatlarını döner.',
        tags: ['Stations', 'GADM'],
        response: {
          200: ProvinceListResponseSchema,
        },
      },
    },
    async () => {
      return gadmService.getAllProvinces();
    }
  );

  // 5. Resmi İlçeler Listesi (GADM 4.1 Level 2)
  app.get(
    '/regions/districts',
    {
      schema: {
        description: 'Belirtilen ile bağlı veya tüm 973 resmi ilçeyi listeler.',
        tags: ['Stations', 'GADM'],
        querystring: Type.Object({
          province: Type.Optional(Type.String()),
          q: Type.Optional(Type.String()),
        }),
        response: {
          200: DistrictListResponseSchema,
        },
      },
    },
    async (request) => {
      const { province, q } = request.query;
      return gadmService.getDistricts(province, q);
    }
  );

  // 6. BBox ve Bölge ile İstasyon Listeleme
  app.get(
    '/',
    {
      schema: {
        description: 'Coğrafi sınır kutusu (BBox), il veya ilçe bazlı istasyonları listeler.',
        tags: ['Stations'],
        querystring: StationQuerySchema,
        response: {
          200: Type.Array(StationSummarySchema),
        },
      },
    },
    async (request) => {
      const { bbox, zoom, operator, city, district, q } = request.query;
      return stationService.getStationsInViewport(bbox, zoom, operator, city, district, q);
    }
  );

  // 7. Slug ile İstasyon Detayı
  app.get(
    '/:slug',
    {
      schema: {
        description: 'İstasyon slug ile detaylı bilgiyi döner. Nullable alanlar null döner.',
        tags: ['Stations'],
        params: Type.Object({
          slug: Type.String(),
        }),
        response: {
          200: StationDetailResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      // Geçersiz karakter denetimi (küçük harf, rakam, tek tire)
      if (slug.includes('!!') || slug.includes('--')) {
        throw new BadRequestError('Geçersiz slug formatı.', 'INVALID_SLUG');
      }

      // ŞRJ/ kanonik yönlendirme kontrolü
      if (slug.toUpperCase().startsWith('ŞRJ/') || slug.toUpperCase().startsWith('SRJ/')) {
        const canonical = slug.replace('/', '-').toLowerCase();
        return reply.redirect(`/api/v1/stations/${canonical}`, 301);
      }

      const detail = await stationService.getStationDetail(slug);
      if (!detail) {
        throw new NotFoundError(`İstasyon bulunamadı: ${slug}`);
      }

      return detail;
    }
  );
};
