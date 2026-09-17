
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { routeBridgeService } from './route-bridge.service.js';
import { CreateRouteRequestSchema, CreateRouteResponseSchema, RouteDetailResponseSchema } from './route-bridge.schema.js';

export const routeBridgeRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // Rota Kodlama (Web -> Mobil QR)
  app.post(
    '/api/v1/route-bridge/encode',
    {
      schema: {
        description: 'Webde oluşturulan durak listesini Base64URL payload ve kısa bağlantıya çevirir.',
        tags: ['Route Bridge'],
        body: CreateRouteRequestSchema,
        response: {
          201: CreateRouteResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { stops, expires_in_hours } = request.body;
      const result = routeBridgeService.encodeRoute(stops, expires_in_hours);
      return reply.status(201).send({
        code: result.code,
        url: result.url,
        expires_at: result.expiresAt,
      });
    }
  );

  // Rota Çözümleme
  const decodeHandler = async (request: any) => {
    const { payload } = request.params;
    const decoded = routeBridgeService.decodeRoute(payload);
    return {
      version: decoded.version,
      stops: decoded.stops,
      expires_at: decoded.expires_at,
      is_valid: true,
    };
  };

  const decodeRouteSchema = {
    schema: {
      description: 'Base64URL rota payloadını doğrular ve istasyon duraklarını döner.',
      tags: ['Route Bridge'],
      params: Type.Object({
        payload: Type.String(),
      }),
      response: {
        200: RouteDetailResponseSchema,
      },
    },
  };

  app.get('/r/:payload', decodeRouteSchema, decodeHandler);
  app.get('/api/v1/routes/bridge/decode/:payload', decodeRouteSchema, decodeHandler);
  app.get('/api/v1/route-bridge/decode/:payload', decodeRouteSchema, decodeHandler);
};
