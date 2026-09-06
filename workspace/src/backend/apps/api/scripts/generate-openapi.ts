
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppConfig } from '@elektriklioto/config'
import { buildApp } from '../src/app.js'

/**
 * US-I1/AC1: packages/contracts/openapi.json CI'da yeniden üretilir; mevcut dosyayla fark
 * varsa build kırılır (`git diff --exit-code`, bu script CI'da o adımdan ÖNCE koşar).
 *
 * `skipDb: true` + sahte config kullanılır: OpenAPI şeması yalnızca rota tanımlarından
 * (zod şemaları) türetilir, gerçek bir Postgres bağlantısı gerektirmez.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const dummyConfig: AppConfig = {
  NODE_ENV: 'test',
  PORT: 3000,
  HOST: '0.0.0.0',
  LOG_LEVEL: 'silent',
  // ZORUNLU KISIT hâlâ geçerli: bu sahte değer hiçbir gerçek bağlantı için kullanılmaz
  // (skipDb: true ile Postgres'e hiç bağlanılmaz), yalnızca şema doğrulamasını geçmek içindir.
  DATABASE_URL: 'postgres://openapi-generation:unused@localhost:5432/unused',
  DB_POOL_MAX: 1,
  SEED_STATION_COUNT: 1,
}

async function main(): Promise<void> {
  const app = await buildApp({ config: dummyConfig, skipDb: true })
  await app.ready()

  const document = app.swagger()
  const outDir = path.resolve(__dirname, '../../../packages/contracts')
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, 'openapi.json')
  await writeFile(outPath, `${JSON.stringify(document, null, 2)}\n`, 'utf-8')

  await app.close()
  console.log(`OpenAPI şeması yazıldı: ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
