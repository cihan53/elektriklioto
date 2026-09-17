
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  StationDetailResponseSchema,
  StationSummarySchema,
  StationQuerySchema,
  StationsClusterResponseSchema,
  StationsListResponseSchema,
} from './station.schema.js';
import { stationService } from './station.service.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const stationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // BBox ile İstasyon Listeleme
  app.get(
    '/',
    {
      schema: {
        description: 'Coğrafi sınır kutusu (BBox) içindeki istasyonları listeler.',
        tags: ['Stations'],
        querystring: StationQuerySchema,
        response: {
          200: Type.Union([
            StationsClusterResponseSchema,
            StationsListResponseSchema,
            Type.Array(StationSummarySchema),
          ]),
        },
      },
    },
    async (request) => {
      const { bbox, zoom, operator } = request.query;
      const zoomNum = zoom !== undefined ? Number(zoom) : 12;
      return stationService.getStationsInViewport(bbox, zoomNum, operator);
    }
  );

  // Slug ile İstasyon Detayı
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
