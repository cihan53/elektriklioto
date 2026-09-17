
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

export const securityPlugin = fp(async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.elektriklioto.com'],
        connectSrc: [
          "'self'",
          'https://api.elektriklioto.com',
          'https://*.tiles.maplibre.org',
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
  });

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const allowedOrigins = [
        'https://elektriklioto.com',
        'https://www.elektriklioto.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];
      if (isLocal || allowedOrigins.includes(origin) || origin.endsWith('.elektriklioto.com')) {
        return cb(null, true);
      }
      return cb(new Error('CORS Not Allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Attestation', 'X-Proximity-Proof'],
  });

  // Zorunlu Lisans Sınırı ve Güvenlik Başlığı
  fastify.addHook('onSend', async (request, reply) => {
    reply.header('X-Service-Type', 'e-Mobility Assistant / EMP Candidate');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  });
});
