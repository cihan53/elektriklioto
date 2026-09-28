Critical finding already visible: port 3000 returns HTTP 500 with `Cannot find module '~/composables/useClickOutside'` — the TALEP-050 fix references a missing composable. And port 3001 is serving a Nuxt instance (not Fastify). Let me verify the details.The previous sprint's UAT report format is clear. Let me verify the backend boot state — whether BUG-01 (plural route imports) persists at HEAD.# UAT Kabul Raporu — [TALEP-050] TALEP-032'nin acil olarak yeniden devreye alınması

> **Belge:** `workspace/docs/uat_kabul_raporu.md`
> **Sprint / Görev:** S35 — Müşteri Denetimi & Saha Onarımları · [TALEP-050] Müşteri Kabulü & UAT Doğrulama Denetimi
> **Denetim Tarihi:** 2026-09-28 · **Denetleyen Rol:** UAT / Canlı Kullanıcı Denetimi
> **Ortam:** `localhost:3000` (Nuxt dev) + `localhost:3001` (Fastify API bekleniyor)

## VERDICT: REDDEDİLDİ — TALEP-050 KAPANAMAZ

TALEP-050 için teslim edilen düzeltme (TALEP-032 reaktivasyonu: "Tüm Operatörler" menüsünün dış alana tıklandığında kapanması) çalışan sistemde **doğrulanamadı**; üstelik düzeltmenin kendisi ana harita sayfasını **HTTP 500 ile çökerten** kritik bir hataya ve daha geniş bir sistem kesintisine yol açmıştır. Görev reddedilir; §4 aksiyonları tamamlanıp yeniden UAT koşulmalıdır.

---

## 1. Talebin Doğrulanması (TALEP-050 / TALEP-032 Belirtisi)

| Adım | Kanıt | Sonuç |
|---|---|---|
| Talep kapsamı | TALEP-032 ("Operatör menüsü dış tıklamada kapanmıyor", durumu "İptal Edildi" idi) TALEP-050 ile reaktive edildi | Bağlam doğrulandı |
| Düzeltme mevcut mu | `FilterChips.vue` satır 5 `import { useClickOutside } from '~/composables/useClickOutside'` + satır 45 `useClickOutside(operatorMenuRoot, ...)` çağrısı, commit `1931a92` ile eklendi | Fix kodda görünüyor |
| Düzeltme çalışıyor mu | `GET http://127.0.0.1:3000/` → **HTTP 500**; gövde: `Cannot find module '~/composables/useClickOutside' imported from '.../components/map/FilterChips.vue'` | **Belirti doğrulanamadı — fix sistemi kırdı** |

> **Varsayım:** `useClickOutside` composable dosyası geliştirici makinesinde yazıldı ancak `git add` ile commit'e girmedi; `1931a92` failover-deploy commit'i yalnızca `FilterChips.vue` değişikliğini taşıyor (`git log -S useClickOutside` → tek eşleşme bu commit; `composables/` dizininde dosya yok, git geçmişinde de hiç yaratılmamış).

## 2. Gerçek Kullanıcı Yolculuğu — Canlı Doğrulama Tablosu

| # | UAT Adımı | Ölçüm | Beklenen | Sonuç |
|---|---|---|---|---|
| 1 | Web haritasına bağlan (`GET /` @3000) | HTTP 500 — `Cannot find module '~/composables/useClickOutside'` (SSR modül çözümleme çökmesi) | 200 | **BAŞARISIZ (Kritik)** |
| 2 | Türkiye geneli kümeleme (`GET /api/v1/stations?bbox=...&zoom=6` @3001) | İstek 5 sn sonra zaman aşımı (HTTP 000) | `type:"clusters"`, count > 0 | **BAŞARISIZ — backend ölü** |
| 3 | İstanbul kümesi → zoom 11 pin kontrolü | API'ye hiç ulaşılamadı | 500+ tekil pin | ÖLÇÜLEMEDİ |
| 4 | Pin → istasyon detay paneli (soket/güç/operatör) | Ana sayfa 500; API 000 | Panel + doğru veri | ÖLÇÜLEMEDİ |
| 5 | "Operatörde Aç / Derin Bağlantı" butonu | Ana sayfa 500; API 000 | Deep-link veya clipboard fallback | ÖLÇÜLEMEDİ |
| 6 | Proje UAT denetim betiği | `node scripts/uat_live_audit.mjs` → **0/6 GEÇTİ** (sağlık, CORS, küme, BBox, veri modeli, HTML — hepsi timeout/500) | 6/6 | **BAŞARISIZ** |
| 7 | Proxy eşliği (`GET :3000/api/v1/operators`) | Zaman aşımı (HTTP 000, 5 sn) | 200 liste | **BAŞARISIZ** |

> **Not:** Harita dışı sayfalar (örn. `/{operator}` SSR — `GET /health` operatör sayfası 200 döndü) render edilebiliyor; kırılma yalnızca `FilterChips.vue`'yu içe aktaran `/` harita sayfasında. Ancak görevin kapsamı tam olarak bu sayfadır.

## 3. HATA (BUG) RAPORU — Engelleyici Bulgular

### BUG-01 (KRİTİK — bloklayıcı): `useClickOutside` composable'ı hiç var olmadı — ana sayfa 500

- **Yeniden üretim:** `curl http://127.0.0.1:3000/` → HTTP 500; Nuxt/Vite hata gövdesinde eksik modül açıkça raporlanıyor.
- **Kök neden:** Commit `1931a92` (failover-deploy, 2026-09-28 23:14) `FilterChips.vue`'ya `import { useClickOutside } from '~/composables/useClickOutside'` ekledi; `workspace/src/frontend/composables/` altında `useClickOutside.ts` **diskte ve git geçmişinde mevcut değil** (mevcut: useChangelog, useOperators, useProximityProof, useSourceHealth, useStations, useTheme, useToast, useUserLocation, useVersionCheck).
- **Etki:** Ana harita ekranı (`/`) ve FilterChips içeren her görünüm SSR'da çöker. Müşterinin talep ettiği özellik (menü dış tıklama) çalışamaz haldedir; kullanıcı hiçbir sayfa göremez.
- **Gereken:** `useClickOutside.ts` composable'ının yazılıp commit'lenmesi (document capture-fazı click/touch dinleyicisi + Escape + unmount'ta temizlik — plan §2.A'daki `stopPropagation`/memory-leak riskleri karşılanmalı).

### BUG-02 (KRİTİK — S34 BUG-01'i regresyonu sürüyor): Backend kaynak koddan ayağa kalkmıyor

- **Yeniden üretim:** `tsx` modül çözümleme testi → `APP_FAIL Cannot find module '.../modules/stations/stations.routes.js' imported from src/app.ts`.
- **Kök neden:** `workspace/src/backend/src/app.ts` satır 11-13 çoğul adlarla import ediyor (`stations.routes.js`, `operators.routes.js`, `reports.routes.js`); diskteki dosyalar tekil (`station.routes.ts`, `operator.routes.ts`, `report.routes.ts`). Ayrıca `healthRoutes` ve `gadmRoutes` register'ları HEAD'de yok — `/api/v1/health/*`, `/api/v1/gadm/*`, `/api/v1/geo/*` uçları kayıtlı değil.
- **Etki:** `npm run dev` (`tsx watch`) anında çöker; `npm run build` aynı yolla kırılır. `tsx watch` süpervizörü (PID 41598, Cumartesi'den beri) çalışır görünüyor ama hiçbir porta bağlanmıyor — "çalışıyor sanılan ölü süreç" yanılsaması.

### BUG-03 (YÜKSEK — ortam): Port 3001'i ölü bir Nuxt süreci işgal ediyor; `/api/v1` kendine proxy'lenip asılıyor

- **Kanıt:** `lsof` → 3001 portu `node` PID 39536 (`nuxt dev`) tarafından dinleniyor — Fastify değil. Bu kopyanın `nitro.devProxy` hedefi `http://127.0.0.1:3001/api/v1`; yani `/api/v1/*` istekleri kendine döner, sonsuz bekler (5 sn timeout → 000).
- **Etki:** Backend düzeltilse bile mevcut oturumda portu alamaz; frontend'in proxy'si hayalet uca bakar. `canli.sh` portları temizlediği için kalıcı değil, ancak denetim anında canlı API tamamen ulaşılamazdı.

## 4. Yeniden Kabul İçin Gerekli Aksiyonlar

1. `workspace/src/frontend/composables/useClickOutside.ts` yazılıp commit'lenmeli; ardından `GET /` 200 ve menü dış-tıklama/Escape senaryosu canlıda doğrulanmalı (TALEP-032 kabul ölçütü).
2. `src/app.ts` import yolları tekil dosya adlarına düzeltilmeli; `healthRoutes` + `gadmRoutes` register'ları geri eklenmeli (S34 BUG-01 kapanışı).
3. Backend `npm run dev` ile 3001'de gerçekten dinlediği kanıtlandıktan sonra §2 tablosunun tüm adımları (küme > 0, zoom 11'de pinler, detay paneli, deep-link/clipboard, `uat_live_audit.mjs` 6/6) yeniden koşulmalıdır.

> **ÇATIŞMA:** Rolümde dosya yazma yetkisi yoktur; eksik composable ve backend import hatalarını yerinde giderme müdahalesi yapılmamıştır. Tespitler yalnızca okuma ve canlı ağ isteğiyle belgelenmiştir.
