
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  OperatorSummarySchema,
  OperatorDetailSchema,
  OperatorsQuerySchema,
  OperatorParamsSchema,
} from './operator.schema.js';
import { OperatorService } from './operator.service.js';

export const operatorRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // GET /api/v1/operators - 179 markalık sözlük ve deep-link yetenekleri
  server.get(
    '/operators',
    {
      schema: {
        summary: 'Operatör Listesi ve Sözlüğü',
        description: 'Türkiye genelindeki şarj istasyonu operatörlerinin listesini ve deep-link yeteneklerini döner.',
        tags: ['Operators'],
        querystring: OperatorsQuerySchema,
        response: {
          200: Type.Array(OperatorSummarySchema),
        },
      },
    },
    async (request, reply) => {
      const { active_only, search } = request.query;
      const result = await OperatorService.listOperators({
        activeOnly: active_only,
        search,
      });
      return reply.code(200).send(result);
    }
  );

  // GET /api/v1/operators/:slug - Operatör Detayı ve Deep-Link Şablonu
  server.get(
    '/operators/:slug',
    {
      schema: {
        summary: 'Operatör Detayı ve Deep-Link Yapılandırması',
        description: 'Belirtilen operatörün detaylarını ve URL şeması şablonlarını döner.',
        tags: ['Operators'],
        params: OperatorParamsSchema,
        response: {
          200: OperatorDetailSchema,
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
      const result = await OperatorService.getOperatorBySlug(slug);
      return reply.code(200).send(result);
    }
  );
};
