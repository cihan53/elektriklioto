Doğrulandı: bu roldeki dosya yazma işi boru hattına ait — Bash üzerinden dosyaya yazmak güvenlik amaçlı engellenmiş durumda (denemeler kanıt olarak yukarıda). Bu nedenle `workspace/docs/test_raporu.md` dosyasının nihai içeriğini aşağıda üretiyorum; pipeline bunu ilgili dosyaya yazacaktır.

---

# Test Raporu — Viewport Sorgusu Bench ve Kabul Testi (AC-01 / AC-02)

**Sprint:** S1 — Çalışan Harita Dilimi (Uçtan Uca)
**Görev:** 15.000 soket seed, autocannon ile 250 eşzamanlı yük, p95<40ms bench raporu, zoom<10 küme testi.
**Tarih:** 2026-09-06
**Sonuç: ÖLÇÜLEMEDİ.** Test edilecek sistem çalıştırılabilir durumda değil; bench koşulmadı, sayı üretilmedi.

## 1. Neden koşulamadı — somut kanıt

`GET /api/v1/stations` uç noktası `workspace/src/backend/` altında **sadece imza olarak** var; çalışan kod yok. `apps/api/src/app.ts` şu importları yapıyor ama dosyalar depoda mevcut değil (doğrudan dosya sistemi kontrolüyle doğrulandı):

| Import (app.ts) | Durum |
|---|---|
| `./plugins/auth-policy.js` | **YOK** |
| `./routes/health.js` | **YOK** |
| `./routes/stations.js` | **YOK** (AC-01/AC-02'nin test edeceği asıl handler) |
| `@elektriklioto/config` | **YOK** (`src/backend/packages/config` paketi hiç yok) |
| `@elektriklioto/db/client` (`createDbClient`) | **YOK** (`src/backend/packages/db` paketi hiç yok) |

`src/backend/apps/api/` içinde `package.json` ve `tsconfig.json` **yok** — bu klasör bağımsız bir npm paketi bile değil; kurulacak bir manifest yok, dolayısıyla `fastify`, `@fastify/swagger`, `@fastify/rate-limit`, `fastify-type-provider-zod`, `drizzle-orm`, `postgres` bağımlılıkları hiç kurulamıyor. Derleme/çalıştırma denemesi yapılmadı çünkü çağrılacak bir script/entrypoint yok.

`workspace/infra/` altındaki paralel iskelette (`@elektriklioto/api`, çalışan `package.json`/`tsconfig.json` var) yalnızca `/healthz` ve `/readyz` mevcut; `/api/v1/stations` orada da **hiç yazılmamış**. İki iskeletten hiçbiri viewport sorgusunu çalıştıran bir uç nokta içermiyor.

Seed script'i yok: `find workspace -iname "*seed*"` **hiçbir sonuç** döndürmedi. `generate-openapi.ts`'teki `SEED_STATION_COUNT` alanı, `infra/packages/config`'teki gerçek `AppConfig` şemasında **yok** — iki config tanımı birbiriyle tutarsız ve ikisi de `src/backend`'in ihtiyacını karşılamıyor. `packages/db/bench/` (backlog'un referans verdiği bench çıktı klasörü) depoda **yok**.

## 2. Ortam ön-kontrolü (yapılabilen kısım)

| Kontrol | Sonuç |
|---|---|
| `docker compose config` (`workspace/infra/docker-compose.yml`) | **GEÇERLİ** — söz dizimi doğru, `postgis/postgis:16-3.4` imajı pinlenmiş |
| `postgis/postgis:16-3.4` imajı yerelde mevcut mu | **HAYIR** — henüz pull edilmemiş |
| Projenin kendi compose'u ile ayakta bir Postgres var mı | **HAYIR** — `docker ps` çıktısında yalnızca `chyz-postgres` (imaj: `postgres:16`, PostGIS değil) adında bu projeyle ilgisiz bir konteyner çalışıyor; `elektriklioto-postgres` adında konteyner yok |
| `autocannon` kurulu mu (global veya proje içi) | **HAYIR** — `which autocannon` boş, `npx autocannon` paket onayı olmadan iptal oldu |
| npm registry erişimi | **VAR** (`registry.npmjs.org` → HTTP 200) — kurulum ortam kısıtından değil, hedefin (test edilecek endpoint) yokluğundan engellendi |

> Registry erişimi olduğu için `autocannon` kurulumu teknik olarak mümkün olurdu; ancak karşısında ölçülecek gerçek bir `/api/v1/stations` handler'ı ve gerçek seed verisi yokken autocannon koşturmak, boş/olmayan bir rotaya karşı 404 gecikmesini "p95" diye rapor etmek anlamına gelir — bu yanıltıcı olacağından koşulmadı.

## 3. AC-01 / AC-02 durum tablosu

| Kriter | Durum | Gerekçe |
|---|---|---|
| **AC-01** — 15k soket / 500k durum, 250 eşzamanlı, p95<40ms | **ÖLÇÜLEMEDİ** | Test edilecek `/api/v1/stations` handler'ı, seed script'i ve çalıştırılabilir `api` paketi (package.json/tsconfig) yok |
| **AC-02** — zoom<10 → `ST_SnapToGrid` küme yanıtı | **ÖLÇÜLEMEDİ** | Aynı handler'a bağımlı; ayrıca hiçbir migration dosyasında `ST_SnapToGrid` çağrısı yok (grep: 0 sonuç) |

## 4. Bu görevi koşulabilir hale getirmek için gereken (blocker listesi)

Aşağıdakiler bu test görevinin kapsamı dışında (backend geliştirme/altyapı görevleri); burada yalnızca tespit edilen eksikler listelenir, çözümü bu rapor önermez:

1. `src/backend/apps/api/package.json` + `tsconfig.json` — paket kurulabilir/derlenebilir hâle gelmeli.
2. `routes/stations.ts`, `routes/health.ts`, `plugins/auth-policy.ts` — `app.ts`'in referans verdiği ama olmayan dosyalar.
3. `src/backend/packages/config` ve `src/backend/packages/db` paketleri (veya `infra/packages/*` ile birleştirme) — `SEED_STATION_COUNT`, `DB_POOL_MAX` dahil tutarlı tek `AppConfig` şeması.
4. 15.000 soket / 500.000 durum kaydı üreten bir seed script (`pnpm db:seed`) — depoda hiç yok.
5. `station_read_model` tablosunu dolduran ingestion/seed akışı — migration şeması (`infra/packages/db/migrations/1788000120000_station-read-model.js`) mevcut ama içini dolduran kod yok.
6. `packages/db/bench/` altında autocannon script'i ve `.env`'de test DB bağlantısı.
7. Projenin kendi `docker-compose.yml`'ı ile ayağa kaldırılmış, `postgis/postgis:16-3.4` imajlı bir Postgres örneği (şu an sahada başka bir projeye ait `postgres:16` konteyneri çalışıyor, bununla karıştırılmamalı).

## 5. Not — kapsam disiplini

Bu görev yalnızca AC-01/AC-02 bench ve kabul testini kapsar; yukarıdaki eksikleri kapatmak (kod yazmak, seed script'i implemente etmek, paket iskeleti kurmak) bu görevin sorumluluğu değildir ve buradan yapılmamıştır. Rapor, "test koşuldu ve geçti/kaldı" yerine "test koşulamadı" gerçeğini olduğu gibi yansıtır.
