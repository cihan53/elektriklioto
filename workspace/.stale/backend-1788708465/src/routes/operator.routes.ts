
import type { FastifyPluginAsync } from 'fastify';
import { sql } from '../db/connection.js';
import { OperatorsResponseSchema, OperatorItemSchema } from '../schemas/operator.schema.js';

export const operatorRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/operators
  fastify.get(
    '/operators',
    {
      schema: {
        description: 'Sistemde kayıtlı aktif şarj operatörlerini listeler.',
        tags: ['Operators'],
        response: {
          200: OperatorsResponseSchema,
        },
      },
    },
    async () => {
      const rows = await sql`
        SELECT id, name, slug, is_active, deep_link_config
        FROM operators
        WHERE is_active = true
        ORDER BY name ASC
      `;

      return {
        count: rows.length,
        data: rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          is_active: r.is_active,
          deep_link_config: r.deep_link_config,
        })),
      };
    }
  );

  // GET /api/v1/operators/:slug
  fastify.get<{ Params: { slug: string } }>(
    '/operators/:slug',
    {
      schema: {
        description: 'Slug bilgisine göre operatör detayını getirir.',
        tags: ['Operators'],
        response: {
          200: {
            data: OperatorItemSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const rows = await sql`
        SELECT id, name, slug, is_active, deep_link_config
        FROM operators
        WHERE slug = ${slug}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Operatör bulunamadı.',
        });
      }

      return {
        data: rows[0],
      };
    }
  );
};
