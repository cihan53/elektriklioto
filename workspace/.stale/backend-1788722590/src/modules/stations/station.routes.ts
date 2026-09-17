
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  StationDetailResponseSchema,
  StationDeepLinkResponseSchema,
  StationParamsSchema,
  StationsQuerySchema,
  StationsResponseSchema,
  StationsQuery,
} from './station.schema.js';
import { StationService } from './station.service.js';

export const stationRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // GET /api/v1/stations - Harita BBox Mekânsal İstasyon ve Küme Listesi
  server.get<{ Querystring: StationsQuery }>(
    '/stations',
    {
      schema: {
        summary: 'Harita BBox İstasyon ve Küme Listeleme',
        description:
          'Verilen harita sınır kutusundaki (bbox) şarj istasyonlarını listeler veya zoom < 10 ise kümeleyerek döner.',
        tags: ['Stations'],
        querystring: StationsQuerySchema,
        response: {
          200: StationsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await StationService.getStationsInBBox(request.query);
      return reply.code(200).send(result);
    }
  );

  // GET /api/v1/stations/:slug - İstasyon Detayı ve Nullable Veri Modeli
  server.get(
    '/stations/:slug',
    {
      schema: {
        summary: 'İstasyon Detayı (Nullable Veri Modeli)',
        description:
          'Seçilen şarj istasyonunun detaylı konum, adres, operatör ve durum verilerini döner. Faz 1 kısıtı gereği soket, güç ve tarife verisi bulunmaz (null döner).',
        tags: ['Stations'],
        params: StationParamsSchema,
        response: {
          200: StationDetailResponseSchema,
          404: Type.Object({
            type: Type.String(),
            title: Type.String(),
            status: Type.Number(),
            detail: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const result = await StationService.getStationBySlugOrCode(slug);
      return reply.code(200).send(result);
    }
  );

  // GET /api/v1/stations/:slug/deep-link - Doğrudan Deep-Link Yönlendirme Verisi
  server.get(
    '/stations/:slug/deep-link',
    {
      schema: {
        summary: 'İstasyon Operatör Deep-Link Bilgisi',
        description:
          'İlgili istasyonu CPO mobil uygulamasında (ZES, Trugo, Eşarj vb.) açacak şema URL ve clipboard fallback bilgisini döner.',
        tags: ['Stations', 'Deep-Link'],
        params: StationParamsSchema,
        response: {
          200: StationDeepLinkResponseSchema,
          404: Type.Object({
            type: Type.String(),
            title: Type.String(),
            status: Type.Number(),
            detail: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const result = await StationService.getStationDeepLink(slug);
      return reply.code(200).send(result);
    }
  );
};
