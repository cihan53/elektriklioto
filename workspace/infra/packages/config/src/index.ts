
import { z } from 'zod';

/**
 * Tek doğrulama noktası: tüm ortam değişkenleri burada tanımlanır.
 * Şema dışı veya eksik bir değişken varsa süreç (api/worker) BAŞLAMAZ.
 * (zorunlu) Bağlantı bilgileri koda gömülmez, yalnızca ortam değişkeninden okunur.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z
    .string()
    .url({ message: 'DATABASE_URL geçerli bir postgres bağlantı adresi olmalı (postgres://user:pass@host:port/db)' }),

  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().max(65535).default(3000),

  WORKER_HEALTH_HOST: z.string().min(1).default('0.0.0.0'),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().max(65535).default(3100),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  CORS_ORIGIN: z.string().min(1).default('https://elektriklioto.com'),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | undefined;

/**
 * Ortam değişkenlerini doğrular ve tekil (cache'lenmiş) bir yapılandırma nesnesi döner.
 * Doğrulama başarısızsa hatayı yazdırıp süreci sonlandırır — sessiz/eksik konfigürasyonla
 * çalışmaya devam etmek yerine erken ve gürültülü başarısızlık tercih edilir.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(bilinmeyen alan)'}: ${issue.message}`)
      .join('\n');

    // eslint-disable-next-line no-console
    console.error(`[config] Ortam değişkenleri doğrulanamadı, süreç başlatılamıyor:\n${details}`);
    process.exit(1);
  }

  cached = parsed.data;
  return cached;
}

/** Yalnızca testlerde önbelleği sıfırlamak için. */
export function resetConfigCacheForTests(): void {
  cached = undefined;
}
