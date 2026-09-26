import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { securityPlugin } from './plugins/security.js';
import { stationRoutes } from './modules/stations/station.routes.js';
import { operatorRoutes } from './modules/operators/operator.routes.js';
import { routeBridgeRoutes } from './modules/route-bridge/route-bridge.routes.js';
import { reportRoutes } from './modules/reports/report.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { gadmRoutes } from './modules/gadm/gadm.routes.js';
import { ProblemDetails } from './types/route-bridge.js';
import { AppError } from './utils/errors.js';
import { ensureDatabaseSeeded } from './modules/stations/station.service.js';
import { operatorService } from './modules/operators/operator.service.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    routerOptions: {
      maxParamLength: 4096,
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => {
      const problem: ProblemDetails = {
        type: 'https://api.elektriklioto.com/errors/rate-limit-exceeded',
        title: 'İstek Sınırı Aşıldı',
        status: 429,
        detail: `Hız sınırı aşıldı. Lütfen ${context.after} sonra tekrar deneyiniz.`,
        instance: request.raw.url,
        code: 'RATE_LIMIT_EXCEEDED',
      };
      return problem;
    },
  });

  await app.register(securityPlugin);

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'elektriklioto.com API',
        description:
          'elektriklioto.com e-Mobilite Asistanı ve Bilgi Hub API Servisi (Faz 1). EPDK lisanslı şarj operatörü değildir; elektrik satışı yapmaz.',
        version: '1.0.0',
        contact: {
          name: 'elektriklioto.com Teknik Ekip',
          url: 'https://elektriklioto.com',
        },
      },
      servers: [
        {
          url: 'https://api.elektriklioto.com',
          description: 'Canlı Üretim API Sunucusu',
        },
      ],
      tags: [
        { name: 'Route Bridge', description: 'Web ve Mobil Rota Aktarım Köprüsü (QR Kod / Base64)' },
        { name: 'Stations', description: 'Şarj İstasyonları ve BBox Arama Servisi' },
        { name: 'Operators', description: 'Şarj Operatörleri ve Entegrasyon Bilgileri' },
        { name: 'Reports', description: 'Kitle Kaynaklı Arıza Bildirimi ve Proximity Proof' },
        { name: 'Health', description: 'Sistem, Kuyruk ve CPO Kaynak Sağlık İzleme Servisi' },
        { name: 'GADM', description: 'GADM 4.1 Türkiye Resmi CBS İl, İlçe, Mahalle ve Geocoding Servisi' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Merkezi RFC 7807 Hata Yakalayıcı (T-07: Mimari ve Stack Trace Sızıntı Koruması)
  app.setErrorHandler((error: any, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toProblemDetails(request.raw.url));
    }

    if (error.validation) {
      const problem: ProblemDetails = {
        type: 'https://api.elektriklioto.com/errors/validation-error',
        title: 'Doğrulama Hatası',
        status: 400,
        detail: error.message,
        instance: request.raw.url,
        code: 'VALIDATION_ERROR',
      };
      return reply.status(400).send(problem);
    }

    const statusCode = error.statusCode || error.status || 500;
    if (statusCode === 429) {
      return reply.status(429).send({
        type: 'https://api.elektriklioto.com/errors/rate-limit-exceeded',
        title: 'İstek Sınırı Aşıldı',
        status: 429,
        detail: error.message || 'Hız sınırı aşıldı.',
        instance: request.raw.url,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    const problem: ProblemDetails = {
      type: 'https://api.elektriklioto.com/errors/internal-error',
      title: statusCode === 404 ? 'Station Not Found' : 'Sunucu Hatası',
      status: statusCode,
      detail: statusCode === 404 ? (error.message || 'Kaynak bulunamadı.') : 'Beklenmeyen bir sunucu hatası oluştu.',
      instance: request.raw.url,
      code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
    };
    return reply.status(statusCode).send(problem);
  });

  // Karşılama ve Durum Rotaları
  app.get('/', async () => ({
    service: 'elektriklioto-api',
    status: 'HEALTHY',
    version: '1.0.0-faz1',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health', async () => ({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  // TALEP-025: Canlı Sürüm ve Durum Bilgisi (Yalnızca genel sürüm ve yayın tarihi döner, dahili altyapı ve veritabanı motoru gizlenir)
  app.get('/version', async () => ({
    status: 'UP',
    service: 'elektriklioto-api',
    version: '1.0.0-faz1',
    release_date: '2026-09-18',
    timestamp: new Date().toISOString(),
  }));

  // Modül Rotaları
  await app.register(routeBridgeRoutes);
  await app.register(stationRoutes, { prefix: '/api/v1/stations' });
  await app.register(operatorRoutes, { prefix: '/api/v1/operators' });
  await app.register(reportRoutes, { prefix: '/api/v1/stations' });
  await app.register(healthRoutes, { prefix: '/api/v1/health' });
  await app.register(gadmRoutes, { prefix: '/api/v1/gadm' });
  await app.register(gadmRoutes, { prefix: '/api/v1/geo' });

  // TALEP-010: PostgreSQL/PostGIS veritabanı ile istasyon ve soket entegrasyonu (otomatik tohumlama)
  try {
    await operatorService.syncWithDb();
    if (process.env.AUTO_SEED === 'true') {
      await ensureDatabaseSeeded();
    }
  } catch {
    // Veritabanı bağlantısı henüz hazır değilse veya test ortamındaysa açılışı engelleme
  }

  return app;
}
