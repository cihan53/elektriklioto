import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { pathToFileURL } from 'node:url';

import { stationRoutes } from './modules/stations/station.routes.js';
import { operatorRoutes } from './modules/operators/operator.routes.js';
import { reportRoutes } from './modules/reports/report.routes.js';
import { routeBridgeRoutes } from './modules/route-bridge/route-bridge.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { gadmRoutes } from './modules/gadm/gadm.routes.js';
import {
  ensureDatabaseSeeded,
  ensureRegionTablesSeeded,
} from './modules/stations/station.service.js';
import { ensureStationDeduped } from './modules/stations/station-dedupe.service.js';
import { operatorService } from './modules/operators/operator.service.js';
import { AppError } from './utils/errors.js';

// Bu dosya elektriklioto.com Fastify API sürecinin (apps/api) kompozisyon
// köküdür. Mimari kaynağı: workspace/docs/teknik_mimari_dokumani.md (§3, §4.1),
// güvenlik kaynağı: workspace/docs/guvenlik_tasarimi.md (§6, §7), paket kaynağı:
// workspace/docs/paket_secim_raporu.md (§3.4). Bağlantı bilgileri (DB, CORS,
// rate limit) yalnızca ortam değişkenlerinden okunur; koda gömülmez (zorunlu kısıt).

declare module 'fastify' {
  interface FastifyInstance {
    db: PostgresJsDatabase;
  }
}

// --- Ortam Yapılandırması -------------------------------------------------

const API_HOST = process.env.API_HOST ?? '0.0.0.0';
const API_PORT = Number(process.env.API_PORT ?? 3001);
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const TRUST_PROXY = (process.env.TRUST_PROXY ?? 'true') === 'true';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? 5432);
const DB_NAME = process.env.DB_NAME ?? 'elektriklioto';
const DB_USER = process.env.DB_USER ?? 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD ?? 'postgres';
const DATABASE_URL =
  process.env.DATABASE_URL ??
  `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 10);

const API_PUBLIC_ORIGIN = process.env.API_PUBLIC_ORIGIN ?? 'https://api.elektriklioto.com';
const MAP_TILE_ORIGIN = process.env.MAP_TILE_ORIGIN ?? 'https://*.tiles.maplibre.org';

const CORS_ALLOWED_ORIGINS = new Set(
  (
    process.env.CORS_ALLOWED_ORIGINS ??
    'https://elektriklioto.com,https://www.elektriklioto.com,http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 120);
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW ?? '1 minute';

// TALEP-046 KORUNACAK: Nuxt web platformu (apps/web) SEO gereği 81 il/ilçe
// dizin sayfasını SSR/ISR ile önceden render eder (bkz. backlog US-08) ve bu
// süreçte docker-compose iç ağı üzerinden api servisine art arda çok sayıda
// istek atar. Genel `@fastify/rate-limit` eşiği (120 istek/dk) yalnızca
// dış/tarayıcı trafiğini hedeflemek üzere tasarlanmıştı; iç ağdan (Nitro
// sunucu süreci) gelen istekler de aynı IP-tabanlı sayaca girince eşik
// hızla aşılıyor, api HTTP 429 dönüyor ve Nuxt bu hatayı yakalamadan
// HTTP 500 olarak sürüyordu (UAT-06 canlı denetim kaydı). Çözüm: yalnızca
// docker iç ağı / loopback aralığından gelen istekleri rate limit
// sayacından muaf tutan bir allowList. Bu korumayı kaldırma / gevşetme
// yalnızca yeni bir UAT ile doğrulanarak yapılabilir.
const TRUSTED_INTERNAL_CIDRS = (
  process.env.INTERNAL_TRUSTED_CIDRS ?? '127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16'
)
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = bitsStr ? Number(bitsStr) : 32;
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  if (bits === 0) return true;
  const mask = (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function isTrustedInternalIp(ip: string): boolean {
  const normalized = ip === '::1' ? '127.0.0.1' : ip.replace('::ffff:', '');
  return TRUSTED_INTERNAL_CIDRS.some((cidr) => isIpInCidr(normalized, cidr));
}

// --- Uygulama Fabrikası -----------------------------------------------------
// SAPMA: `@fastify/type-provider-typebox` paket seçim raporunda listelenmediği
// için kullanılmadı. `@sinclair/typebox` şemaları zaten geçerli JSON Schema
// ürettiğinden Fastify'a doğrudan verilir; tip çıkarımı modül dosyalarının
// kendi sorumluluğundadır.

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: TRUST_PROXY,
    routerOptions: {
      // /r/:payload köprüsü Base64URL rota dizilerini path parametresinde
      // taşır; varsayılan 100 char sınırı 414 URI Too Long üretir.
      maxParamLength: 4096,
    },
    logger: {
      level: LOG_LEVEL,
      redact: {
        // KVKK / Konum Gizliliği (zorunlu): erişim loglarında coğrafi
        // parametreler ve istemci IP'si asla açık biçimde tutulmaz.
        paths: [
          'req.headers.authorization',
          'req.headers["x-device-attestation"]',
          'req.query.bbox',
          'req.query.lat',
          'req.query.lon',
          'req.ip',
        ],
        remove: true,
      },
    },
  });

  // --- Veritabanı Bağlantısı (PostGIS) -------------------------------------
  const sqlClient = postgres(DATABASE_URL, {
    max: DB_POOL_MAX,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  const db = drizzle(sqlClient);
  app.decorate('db', db);

  app.addHook('onClose', async () => {
    await sqlClient.end({ timeout: 5 });
  });

  // --- Güvenlik Başlıkları (@fastify/helmet) --------------------------------
  // TALEP-070 KORUNACAK: UAT-02 canlı denetimi crossOriginResourcePolicy değerinin
  // 'cross-origin' olmasını zorunlu kılar; istemci harita ve varlıkları bu başlıkla doğrular.
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.elektriklioto.com'],
        connectSrc: ["'self'", API_PUBLIC_ORIGIN, MAP_TILE_ORIGIN],
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
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
  });

  // --- CORS -----------------------------------------------------------------
  // TALEP-070 KORUNACAK: Yerel ortam (127.0.0.1, localhost) ve *.elektriklioto.com
  // origin'leri için CORS tam izinlidir (UAT-02 gereksinimi).
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      // Yerel geliştirme (nuxt dev + nitro devProxy) ve *.elektriklioto.com
      // alt alanları her zaman izinlidir; kalanı env listesi belirler.
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocal || CORS_ALLOWED_ORIGINS.has(origin) || origin.endsWith('.elektriklioto.com')) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS: izin verilmeyen kaynak'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Attestation'],
  });

  // --- Hız Sınırlama (Token Bucket) -----------------------------------------
  await app.register(rateLimit, {
    global: true,
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW,
    allowList: (request) => isTrustedInternalIp(request.ip),
    keyGenerator: (request) => {
      const deviceToken = request.headers['x-device-attestation'];
      return typeof deviceToken === 'string' && deviceToken.length > 0
        ? `${request.ip}:${deviceToken}`
        : request.ip;
    },
    addHeadersOnExceeding: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true },
    addHeaders: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true, 'retry-after': true },
  });

  // --- OpenAPI 3.1 Sözleşmesi -------------------------------------------------
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'elektriklioto.com API',
        description:
          "e-Mobilite Asistani / EMP adayi bilgi hub API'si. Bu platform Lisansli Sarj Operatoru " +
          've EPDK lisansina tabi bir elektrik satis kurulusu DEGILDIR; dogrudan sarj baslatma ' +
          've faturalandirma islemi yapmaz.',
        version: '1.0.0',
      },
      servers: [{ url: API_PUBLIC_ORIGIN }],
      tags: [
        { name: 'stations', description: 'Istasyon kesif (bbox), detay ve slug uc noktalari' },
        { name: 'operators', description: 'Operator sozlugu ve deep-link yapilandirmasi' },
        { name: 'reports', description: 'Kitle kaynakli ariza bildirimleri (proximity_proof)' },
        { name: 'routes', description: "Web'den mobile rota aktarim koprusu" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
  });

  // --- Yasal Konumlandırma Bildirimi (her yanıtta) ---------------------------
  // Guvenlik tasarimi 9.2 madde 3: platformun EMP statusunde bir rehber
  // oldugu, lisansli sarj operatoru olmadigi API yanitlarinda beyan edilir.
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header(
      'X-Platform-Role',
      'e-Mobilite Asistani (EMP Adayi) - Not a Licensed Charging Operator',
    );
    reply.header('X-Service-Type', 'e-Mobility Assistant / EMP Candidate');
    return payload;
  });

  // --- Kök ve Sağlık Uç Noktaları --------------------------------------------
  app.get(
    '/',
    { config: { rateLimit: false } },
    async () => ({
      name: 'elektriklioto.com API',
      status: 'ok',
      role: 'e-Mobilite Asistani / EMP adayi - Lisansli Sarj Operatoru degildir.',
      documentation: '/documentation',
    }),
  );

  app.get('/health', { config: { rateLimit: false } }, async (_request, reply) => {
    let dbHealthy = true;
    try {
      await sqlClient`select 1`;
    } catch (error) {
      dbHealthy = false;
      app.log.warn({ err: error }, 'Saglik kontrolu: veritabani erisilemedi');
    }
    reply.status(200);
    return {
      status: 'ok',
      db: dbHealthy ? 'up' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  });

  // TALEP-025 & TALEP-069 KORUNACAK: Canlı Sürüm ve Durum Bilgisi (Yalnızca genel sürüm ve yayın tarihi döner, dahili altyapı ve veritabanı motoru gizlenir)
  const versionHandler = async () => ({
    status: 'UP',
    service: 'elektriklioto-api',
    version: '1.0.0-faz1',
    release_date: '2026-09-18',
    timestamp: new Date().toISOString(),
  });

  app.get('/version', { config: { rateLimit: false } }, versionHandler);
  app.get('/api/version', { config: { rateLimit: false } }, versionHandler);
  app.get('/api/v1/version', { config: { rateLimit: false } }, versionHandler);

  // --- Hata ve 404 İşleyicileri (RFC 7807 Problem Details) --------------------
  // TALEP-053: kapsülleme bağlamı kayıt anında yakalandığı için hata
  // işleyicileri modül register() çağrılarından ÖNCE tanımlanmak zorundadır;
  // aksi halde plugin rotaları Fastify'nin varsayılan hata gövdesine düşer.
  app.setNotFoundHandler((request, reply) => {
    reply
      .status(404)
      .type('application/problem+json')
      .send({
        type: 'about:blank',
        title: 'Bulunamadi',
        status: 404,
        detail: `${request.method} ${request.url} bulunamadi.`,
        instance: request.url,
      });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Alan bilinçli uygulama hataları (NotFoundError, BadRequestError,
    // UnauthorizedError vb.) kendi RFC 7807 problem gövdesini üretir.
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .type('application/problem+json')
        .send(error.toProblemDetails(request.url));
    }

    // Fastify/Ajv şema doğrulama hataları (zorunlu query eksik, pattern
    // ihlali vb.) 400 problem+json olarak döner — ham doğrulama çıktısı
    // istemciye sızdırılmaz.
    if (error.validation) {
      return reply
        .status(400)
        .type('application/problem+json')
        .send({
          type: 'https://api.elektriklioto.com/errors/validation-error',
          title: 'Doğrulama Hatası',
          status: 400,
          detail: 'İstek parametreleri beklenen şemaya uymuyor.',
          instance: request.url,
        });
    }

    const statusCode =
      typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Sunucu hatasi');
    } else {
      request.log.warn({ err: error }, 'Istemci hatasi');
    }

    reply
      .status(statusCode)
      .type('application/problem+json')
      .send({
        type: 'about:blank',
        title: statusCode === 500 ? 'Sunucu Hatasi' : (error.name ?? 'Istek Hatasi'),
        status: statusCode,
        detail:
          statusCode === 500
            ? 'Beklenmeyen bir sunucu hatasi olustu. Ic hata detaylari yanita sizdirilmaz.'
            : error.message,
        instance: request.url,
      });
  });

  // --- Modül Kayıtları (/api/v1) ----------------------------------------------
  // TALEP-053: routeBridgeRoutes kendi mutlak yollarını taşır
  // (/api/v1/route-bridge/encode, /r/:payload) — prefix'e sokulmamalıdır.
  // reportRoutes '/:id/reports' deseniyle istasyon alt yolunu tamamlar.
  await app.register(routeBridgeRoutes);
  await app.register(stationRoutes, { prefix: '/api/v1/stations' });
  await app.register(operatorRoutes, { prefix: '/api/v1/operators' });
  await app.register(reportRoutes, { prefix: '/api/v1/stations' });
  await app.register(healthRoutes, { prefix: '/api/v1/health' });
  await app.register(gadmRoutes, { prefix: '/api/v1/gadm' });
  await app.register(gadmRoutes, { prefix: '/api/v1/geo' });

  // TALEP-010, TALEP-064 & TALEP-065: PostgreSQL/PostGIS veritabanı ile istasyon ve soket entegrasyonu
  // (otomatik tohumlama ve merkezi dinamik veri senkronizasyonu).
  // TALEP-064 KORUNACAK: Veritabanı boşken veya test senaryolarında API fallback mock verisi dönmez;
  // in-memory fallback yalnızca ENABLE_MOCK_FALLBACK=true açıkça tanımlandığında devreye girer.
  // Veritabanı henüz hazır değilse veya test ortamındaysa açılış engellenmez.
  try {
    await operatorService.syncWithDb();
    await ensureRegionTablesSeeded();
    if (process.env.AUTO_SEED === 'true') {
      await ensureDatabaseSeeded();
    }
    // TALEP-054 KORUNACAK: Harita küme/sayaçlarının şişmesine yol açan mükerrer
    // istasyon kayıtları (aynı fiziksel sahanın ŞRJ/, ZES/, TRU/ vb. farklı
    // kimliklerle yazılması) süreç başına bir kez tekilleştirilir. Temizlik
    // tohumlamadan SONRA çalışır ki hem eski kopyalar hem de seed sonrası
    // durum tutarlı olsun; DB'ye erişilemezse fonksiyon içeride sessizce geçer
    // ve sorgu-tarafı DISTINCT ON tekilleştirmesi (stationDedupeSubquery)
    // sayımları yine doğru tutar. Bu çağrıyı kaldırma — prod'daki mevcut
    // kopyalar ancak bu self-heal ile temizlenir.
    await ensureStationDeduped();
  } catch {
    // DB bağlantısı kurulamadığında fallback veri kaynaklarıyla devam et
  }

  return app;
}

// --- Süreç Girişi -------------------------------------------------------------

const isMainModule =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  buildApp()
    .then(async (app) => {
      const shutdown = async (signal: string) => {
        app.log.info({ signal }, 'API sureci kapatiliyor');
        try {
          await app.close();
          process.exit(0);
        } catch (error) {
          app.log.error({ err: error }, 'Kapatma sirasinda hata');
          process.exit(1);
        }
      };

      process.on('SIGTERM', () => void shutdown('SIGTERM'));
      process.on('SIGINT', () => void shutdown('SIGINT'));

      await app.listen({ host: API_HOST, port: API_PORT });
    })
    .catch((error) => {
      console.error('Fastify API baslatilamadi:', error);
      process.exit(1);
    });
}
