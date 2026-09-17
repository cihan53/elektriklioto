
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { operatorService } from './operator.service.js';
import { OperatorListResponseSchema, OperatorSchema } from './operator.schema.js';
import { NotFoundError } from '../../utils/errors.js';

export const operatorRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    '/',
    {
      schema: {
        description: '179 kayıtlı şarj operatörü sözlüğünü listeler.',
        tags: ['Operators'],
        response: {
          200: OperatorListResponseSchema,
        },
      },
    },
    async () => {
      return operatorService.getAll();
    }
  );

  app.get(
    '/:slug',
    {
      schema: {
        description: 'Slug ile tekil operatör detayını döner.',
        tags: ['Operators'],
        params: Type.Object({
          slug: Type.String(),
        }),
        response: {
          200: OperatorSchema,
        },
      },
    },
    async (request) => {
      const { slug } = request.params;
      const op = operatorService.getBySlug(slug);
      if (!op) {
        throw new NotFoundError(`Operatör bulunamadı: ${slug}`);
      }
      return op;
    }
  );
};
