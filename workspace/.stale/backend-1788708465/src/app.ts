
import fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { stationRoutes } from './routes/station.routes.js';
import { operatorRoutes } from './routes/operator.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test',
    trustProxy: true,
  });

  // Güvenlik Başlıkları (OWASP / Helmet)
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
    hidePoweredBy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  // CORS Politikası
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || origin.includes('elektriklioto.com') || origin.includes('localhost')) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });

  // Token-Bucket Hız Sınırlaması (120 req / dk genel sınır)
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  // OpenAPI 3.1 Dokümantasyonu
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'elektriklioto.com API',
        description: 'Türkiye Şarj İstasyonları e-Mobilite Asistanı ve BBox Mekânsal API',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'https://api.elektriklioto.com',
          description: 'Üretim Sunucusu',
        },
        {
          url: 'http://localhost:3001',
          description: 'Yerel Geliştirme',
        },
      ],
      tags: [
        { name: 'Stations', description: 'İstasyon ve coğrafi BBox arama uç noktaları' },
        { name: 'Operators', description: 'Operatör sözlüğü ve deep-link şablonları' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // EMP Yasal Lisans Sınırı Başlığı (Her yanıta enjekte edilir)
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-EMP-Notice', 'elektriklioto.com is an e-Mobility Assistant and not a licensed charging operator.');
  });

  // Sağlık Kontrolü
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'elektriklioto-backend',
      timestamp: new Date().toISOString(),
    };
  });

  // Rota Modülleri (/api/v1)
  await app.register(stationRoutes, { prefix: '/api/v1' });
  await app.register(operatorRoutes, { prefix: '/api/v1' });

  return app;
}
