
import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { securityPlugin } from './plugins/security.js';
import { swaggerPlugin } from './plugins/swagger.js';
import { stationRoutes } from './modules/stations/station.routes.js';
import { operatorRoutes } from './modules/operators/operator.routes.js';
import { HttpError } from './utils/errors.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    trustProxy: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Güvenlik ve Dokümantasyon Eklentileri
  await app.register(securityPlugin);
  await app.register(swaggerPlugin);

  // Sağlık Kontrolü Uç Noktası
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'api.elektriklioto.com',
  }));

  // API Rotaları (/api/v1 öneki ile)
  await app.register(
    async (apiV1) => {
      await apiV1.register(stationRoutes);
      await apiV1.register(operatorRoutes);
    },
    { prefix: '/api/v1' }
  );

  // Global 404 RFC 7807 Yakalayıcı
  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      type: 'https://api.elektriklioto.com/errors/not-found',
      title: 'Kaynak Bulunamadı',
      status: 404,
      detail: `'${request.method} ${request.url}' yolu sistemde mevcut değildir.`,
      instance: request.url,
    });
  });

  // Global RFC 7807 Hata Yakalayıcı
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.status).send(error.toProblemDetails(request.url));
    }

    if (error.validation) {
      return reply.code(400).send({
        type: 'https://api.elektriklioto.com/errors/validation-error',
        title: 'Doğrulama Hatası',
        status: 400,
        detail: error.message,
        instance: request.url,
      });
    }

    // Beklenmeyen Hatalar (İç log detayları dışarı sızdırılmaz)
    return reply.code(500).send({
      type: 'https://api.elektriklioto.com/errors/internal-server-error',
      title: 'Sunucu Hatası',
      status: 500,
      detail: 'Beklenmeyen bir sunucu hatası oluştu.',
      instance: request.url,
    });
  });

  return app;
}
