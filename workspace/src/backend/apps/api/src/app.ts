
import { createDbClient } from '@elektriklioto/db/client'
import { loadConfig, type AppConfig } from '@elektriklioto/config'
import Fastify, { type FastifyInstance } from 'fastify'
import type postgres from 'postgres'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { registerAuthPolicy } from './plugins/auth-policy.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerStationsRoutes } from './routes/stations.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig
    db: PostgresJsDatabase
    pgClient: ReturnType<typeof postgres>
  }
}

export interface BuildAppOptions {
  config?: AppConfig
  /** OpenAPI şema üretimi gibi gerçek DB bağlantısı gerektirmeyen senaryolar için. */
  skipDb?: boolean
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = opts.config ?? loadConfig()

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // KVKK ZORUNLU KISIT (güvenlik_tasarimi.md §5.1): konum/token alanları log'a düşmez.
      redact: {
        paths: [
          'req.query.bbox',
          'req.query.lat',
          'req.query.lon',
          'req.headers.authorization',
        ],
        censor: '[REDACTED]',
      },
    },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // NOT: decoratorlar register() ile değil doğrudan kök `app` üzerinde tanımlanır —
  // aksi halde Fastify encapsulation kuralı yüzünden sonradan register edilen sibling
  // route eklentileri (health/stations) bu decoratorları göremez.
  app.decorate('config', config)

  if (!opts.skipDb) {
    const { db, pgClient } = createDbClient(config)
    app.decorate('db', db)
    app.decorate('pgClient', pgClient)
    app.addHook('onClose', async () => {
      await pgClient.end({ timeout: 5 })
    })
  }

  registerAuthPolicy(app)

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'elektriklioto.com API',
        description:
          'e-Mobilite asistanı — istasyon keşif ve harita API yüzeyi. Tarife/durum bilgisi ' +
          'amaçlıdır, bağlayıcı değildir; platform lisanslı bir şarj operatörü değildir.',
        version: '1.0.0',
      },
      servers: [{ url: 'https://api.elektriklioto.com' }],
      tags: [{ name: 'stations', description: 'İstasyon keşif ve harita uçları' }],
    },
    transform: jsonSchemaTransform,
  })

  // SAPMA: güvenlik_tasarimi.md §4.2 "PostgreSQL destekli store" talimatı bu görevin kapsamı
  // dışıdır (özel bir rate-limit store implementasyonu gerektirir, ayrı bir görev konusudur).
  // Bu görevde @fastify/rate-limit'in varsayılan bellek-içi sayaç deposu kullanılır.
  await app.register(rateLimit, {
    global: false,
    max: 120,
    timeWindow: '1 minute',
  })

  await app.register(registerHealthRoutes)
  await app.register(registerStationsRoutes, { prefix: '/api/v1' })

  return app
}
