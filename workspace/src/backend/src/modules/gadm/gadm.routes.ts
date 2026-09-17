
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { gadmService } from './gadm.service.js';
import {
  ProvinceListResponseSchema,
  ProvinceItemSchema,
  DistrictListResponseSchema,
  DistrictItemSchema,
  NeighborhoodListResponseSchema,
  SearchResultListResponseSchema,
  SearchQuerySchema,
  GeocodeQuerySchema,
  GeocodeResultSchema,
  ReverseGeocodeQuerySchema,
  ReverseGeocodeResultSchema,
} from './gadm.schema.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const gadmRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // 1. Tüm 81 İli Listeleme (GADM 4.1 Level 1)
  app.get(
    '/provinces',
    {
      schema: {
        description: 'Türkiye resmi 81 ilinin GADM 4.1 CBS sınır ve merkez koordinatlarını listeler.',
        tags: ['GADM'],
        response: {
          200: ProvinceListResponseSchema,
        },
      },
    },
    async () => {
      return gadmService.getAllProvinces();
    }
  );

  // 2. İl Detayı
  app.get(
    '/provinces/:slug',
    {
      schema: {
        description: 'Slug ile tekil ilin merkez koordinatı ve sınır kutusunu (bbox) döner.',
        tags: ['GADM'],
        params: Type.Object({
          slug: Type.String(),
        }),
        response: {
          200: ProvinceItemSchema,
        },
      },
    },
    async (request) => {
      const { slug } = request.params;
      const province = gadmService.getProvinceBySlug(slug);
      if (!province) {
        throw new NotFoundError(`İl bulunamadı: ${slug}`, 'PROVINCE_NOT_FOUND');
      }
      return province;
    }
  );

  // 3. İle Bağlı İlçeler (GADM 4.1 Level 2)
  app.get(
    '/provinces/:slug/districts',
    {
      schema: {
        description: 'Belirtilen ile bağlı resmi ilçeleri ve merkez koordinatlarını listeler.',
        tags: ['GADM'],
        params: Type.Object({
          slug: Type.String(),
        }),
        response: {
          200: DistrictListResponseSchema,
        },
      },
    },
    async (request) => {
      const { slug } = request.params;
      const province = gadmService.getProvinceBySlug(slug);
      if (!province) {
        throw new NotFoundError(`İl bulunamadı: ${slug}`, 'PROVINCE_NOT_FOUND');
      }
      return gadmService.getDistricts(slug);
    }
  );

  // 4. İlçe Arama / Listeleme
  app.get(
    '/districts',
    {
      schema: {
        description: '973 resmi ilçeyi listeler veya il/arama filtresi uygular.',
        tags: ['GADM'],
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

  // 5. İlçe Detayı
  app.get(
    '/districts/:slug',
    {
      schema: {
        description: 'Slug ile ilçe detayını, merkez koordinatını ve sınır kutusunu döner.',
        tags: ['GADM'],
        params: Type.Object({
          slug: Type.String(),
        }),
        response: {
          200: DistrictItemSchema,
        },
      },
    },
    async (request) => {
      const { slug } = request.params;
      const district = gadmService.getDistrictBySlug(slug);
      if (!district) {
        throw new NotFoundError(`İlçe bulunamadı: ${slug}`, 'DISTRICT_NOT_FOUND');
      }
      return district;
    }
  );

  // 6. İlçeye Bağlı Mahalleler (GADM 4.1 Level 3)
  app.get(
    '/districts/:slug/neighborhoods',
    {
      schema: {
        description: 'İlçeye bağlı resmi mahalleleri ve koordinatlarını listeler.',
        tags: ['GADM'],
        params: Type.Object({
          slug: Type.String(),
        }),
        response: {
          200: NeighborhoodListResponseSchema,
        },
      },
    },
    async (request) => {
      const { slug } = request.params;
      const district = gadmService.getDistrictBySlug(slug);
      if (!district) {
        throw new NotFoundError(`İlçe bulunamadı: ${slug}`, 'DISTRICT_NOT_FOUND');
      }
      return gadmService.getNeighborhoods(slug);
    }
  );

  // 7. Harita Arama ve Otomatik Tamamlama
  app.get(
    '/search',
    {
      schema: {
        description: 'İl, ilçe ve mahalleler arasında akıllı metin araması ve otomatik tamamlama yapar.',
        tags: ['GADM'],
        querystring: SearchQuerySchema,
        response: {
          200: SearchResultListResponseSchema,
        },
      },
    },
    async (request) => {
      const { q, limit } = request.query;
      return gadmService.search(q, limit);
    }
  );

  // 8. Forward Geocoding (Metin -> Koordinat & Sınır Kutusu)
  app.get(
    '/geocode',
    {
      schema: {
        description: 'Adres veya bölge metnini GADM 4.1 resmi CBS veritabanında çözümler ve koordinatları döner.',
        tags: ['GADM'],
        querystring: GeocodeQuerySchema,
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

  // 9. Reverse Geocoding (Koordinat -> Resmi Bölge Hiyerarşisi)
  app.get(
    '/reverse-geocode',
    {
      schema: {
        description: 'Enlem ve boylam koordinatlarının ait olduğu resmi il, ilçe ve mahalleyi tespit eder.',
        tags: ['GADM'],
        querystring: ReverseGeocodeQuerySchema,
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
};

export const geoRoutes = gadmRoutes;
