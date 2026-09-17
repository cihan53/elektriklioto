
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/env.js';

/**
 * OWASP ve Güvenlik Tasarım Dokümanına Uygun Güvenlik Katmanı
 */
const securityPluginAsync: FastifyPluginAsync = async (fastify) => {
  // 1. Helmet Güvenlik Başlıkları
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.elektriklioto.com'],
        connectSrc: ["'self'", 'https://api.elektriklioto.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
  });

  // 2. CORS Yapılandırması
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('CORS İlkesi İhlali: İzin verilmeyen köken'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Attestation'],
    credentials: true,
  });

  // 3. Token-Bucket Hız Sınırlaması
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX_PER_MINUTE,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      type: 'https://api.elektriklioto.com/errors/rate-limit-exceeded',
      title: 'Hız Sınırı Aşıldı',
      status: 429,
      detail: 'Çok fazla istek gönderdiniz. Lütfen bir süre bekleyip tekrar deneyin.',
    }),
  });
};

export const securityPlugin = fp(securityPluginAsync, {
  name: 'security-plugin',
});
