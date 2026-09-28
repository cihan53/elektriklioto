Backend üç kırık import yüzünden hiç ayağa kalkmıyor. Üretimde kullanılan alternatif giriş noktalarını kontrol ediyorum.Backend eski derleme (dist) ile ayağa kalktı, proxy 200. Şimdi UAT adımlarını icra ediyorum.Kümeler ve pin verisi akıyor. Detay/deep-link/geo-search uçlarını ve mevcut UAT denetim betiğini kontrol ediyorum.# UAT Kabul Raporu — [TALEP-049] Canlı ortam hatası: SearchInput.vue './geoSearch' modülünü bulamıyor

> **Belge:** `workspace/docs/uat_kabul_raporu.md`
> **Sprint / Görev:** S34 — Müşteri Denetimi & Saha Onarımları · [TALEP-049] Müşteri Kabulü & UAT Doğrulama Denetimi
> **Denetim Tarihi:** 2026-09-28 · **Denetleyen Rol:** UAT / Canlı Kullanıcı Denetimi
> **Ortam:** `localhost:3000` (Nuxt dev) + `localhost:3001` (Fastify API)

## VERDICT: REDDEDİLDİ — TALEP-049 KAPANAMAZ

Müşterinin bildirdiği belirti (ana ekranın `./geoSearch` modül hatasıyla kilitlenmesi) çalışan sistemde **çözülmüştür**; ancak teslimat kaynak koddan yeniden üretilemez durumdadır ve denetim sırasında **backend'in kaynaktan hiç ayağa kalkamadığı yeni bir kritik hata** yakalanmıştır. Görev, aşağıdaki iki engel giderilip yeniden UAT koşulana dek reddedilir.

---

## 1. Talebin Doğrulanması (TALEP-049 Belirtisi)

| Adım | Kanıt | Sonuç |
|---|---|---|
| Hata yeniden üretildi | Yeniden başlatma öncesi `GET /` → HTTP 500, gövdede `Cannot find module './geoSearch' imported from '.../components/map/SearchInput.vue'` | Belirti doğrulandı |
| Düzeltme mevcut | `workspace/src/frontend/components/map/geoSearch.ts` diskte mevcut; `fetchGadmSearch` `/geo/search` ve `/gadm/search` uçlarını sırayla dener, 4 sn timeout + sessiz fallback içerir | Fix uygulanmış |
| Canlı doğrulama | Ortam yeniden başlatıldıktan sonra `GET /` → HTTP 200; SSR HTML'de `TypeError` / `Cannot find module` / `Server Error` eşleşmesi **0** | Belirti giderildi |
| Geliştirici testi (bilgi amaçlı) | `tests/talep-049.spec.ts` — 8/8 vitest geçti (izole test, UAT kanıtı sayılmadı) | Geçti |

> **Varsayım:** Eski Nuxt süreci (PID 5034, 22:31'de başlatılmış) `geoSearch.ts`'nin 22:52'de oluşturulmasından önce kaldığı için vite-node modül çözümleme hatasını önbelleğe almıştı; düzeltmenin canlıya yansıması için servis yeniden başlatma gerektirdi. Bu, "fix + restart" bağımlılığı olarak rapora işlenmiştir.

## 2. Gerçek Kullanıcı Yolculuğu — Canlı Doğrulama Tablosu

| # | UAT Adımı | Ölçüm | Beklenen | Sonuç |
|---|---|---|---|---|
| 1 | Web haritasına bağlan (`GET /`) | HTTP 200, hatasız SSR | 200 | GEÇTİ |
| 2 | Türkiye geneli kümeleme (`bbox=25.5,35.5,45.0,42.5&zoom=6`) | `{"type":"clusters","count":81}` — İstanbul kümesi 4.525, Ankara 2.174, Antalya 982 istasyon | küme > 0 | GEÇTİ |
| 3 | Büyükşehir kümesi → zoom 11 İstanbul bbox | `{"type":"stations","count":2000}` tekil pin | 500+ pin | GEÇTİ |
| 4 | Pin → istasyon detayı (`GET /stations/trugo-tsyd-istanbul`) | 200; `name=TSYD`, `istasyon_no=ŞRJ/10313`, `operator=Trugo`, `connector_types=["CCS2"]`, `power_kw=180` | doğru veri | GEÇTİ |
| 5 | Derin bağlantı verisi | Detay gövdesinde `deep_link: "trugo://charge?station=10313"`, `clipboard_fallback:false` | şema üretimi | GEÇTİ |
| 6 | İstasyon detay sayfası SSR (`/trugo/trugo-tsyd-istanbul`) | HTTP 200 | 200 | GEÇTİ |
| 7 | Geo arama (TALEP-049 modülünün canlı hedefi) | `GET /api/v1/geo/search?q=esenler` → Esenler, İstanbul (koordinat+bbox); proxy üzerinden `:3000` da aynı | sonuç döner | GEÇTİ |
| 8 | Operatör sözlüğü | `GET /api/v1/operators` → 180 kayıt | > 0 | GEÇTİ |
| 9 | Hatalı istek davranışı | `bbox=abc,...` → RFC 7807 `400 Geçersiz İstek` (doğru red, bug değil) | kontrollü 400 | GEÇTİ |
| 10 | Proje UAT denetim betiği | `node scripts/uat_live_audit.mjs` → **6/6 GEÇTİ** (sağlık, CORS, küme, BBox, veri modeli, HTML) | 6/6 | GEÇTİ |

> **Not:** `GET /api/v1/stations/{slug}/deep-link` ayrı uç noktası çalışan derlemede 404 dönmektedir; ancak detay yanıtı `deep_link` nesnesini zaten gömülü taşıdığından ve istemci (`useStations.fetchStationDeepLink`) hatayı `null` ile tolere ettiğinden kullanıcı akışı kırılmaz — düşük öncelikli uyarı olarak kaydedildi.

## 3. HATA (BUG) RAPORU — Engelleyici Bulgular

### BUG-01 (KRİTİK): Backend kaynak koddan hiç başlamıyor — `ERR_MODULE_NOT_FOUND`

- **Yeniden üretim:** `./workspace/canli.sh` → `tsx watch src/server.ts` anında çöker:
  `Cannot find module '.../src/modules/stations/stations.routes.js' imported from src/app.ts`
- **Kök neden:** `workspace/src/backend/src/app.ts` (HEAD, commit `3ae2e92` — önceki sprintin TALEP-046 "UAT düzeltmesi") var olmayan çoğul dosya adlarını import eder: `stations.routes.js`, `operators.routes.js`, `reports.routes.js`. Diskteki gerçek dosyalar tekil: `station.routes.ts`, `operator.routes.ts`, `report.routes.ts`.
- **Ek kayıp:** Aynı commit `healthRoutes` ve `gadmRoutes` import + register satırlarını da silmiştir. Dosya adları düzeltilse bile `/api/v1/health/*`, `/api/v1/gadm/*` ve `/api/v1/geo/*` uçları kayıtlı olmayacaktır — `geoSearch.ts`'nin çağırdığı `/geo/search` + `/gadm/search` uçları bunlardır; yani TALEP-049 fix'i kaynak üzerinden **işlevsiz** kalır.
- **UAT'i mümkün kılan geçici durum:** `workspace/src/backend/dist/server.bundle.cjs` (2026-09-27 derlemesi, regresyondan önceki kod) `PORT=3001` ile ayağa kaldırılarak testler koşuldu. Bayat artefakt; yeni derleme aynı şekilde çökecektir.
- **Etki:** `localhost:3001` ölü → proxy üzerinden tüm `/api/v1/*` istekleri 000. Üretim derlemesi de aynı hatayla kırılır.

### BUG-02 (YÜKSEK): TALEP-049 düzeltmesi commit'lenmemiş

- `git status`: `geoSearch.ts` ve `tests/talep-049.spec.ts` **untracked (`??`)**; `workspace/docs/musteri_talepleri.md` ise değiştirilmiş ama commit'lenmemiş.
- **Etki:** Temiz klon / deploy'da `geoSearch.ts` yok → `./geoSearch` import hatası aynen geri döner. Fix yalnızca yerel diskte yaşamaktadır; AGENTS.md'deki Issue → branch → commit → PR akışı tamamlanmamıştır.

## 4. Yeniden Kabul İçin Gerekli Aksiyonlar

1. `src/app.ts` import yolları tekil dosya adlarıyla düzeltilmeli ve kaldırılan `healthRoutes` + `gadmRoutes` (`/api/v1/health`, `/api/v1/gadm`, `/api/v1/geo` alias) register'ları geri eklenmelidir.
2. `geoSearch.ts` + `tests/talep-049.spec.ts` TALEP-049 branch'inde commit'lenip PR'a bağlanmalıdır (`Closes #80`).
3. Düzeltme sonrası `tsx watch` ile backend'in 3001'de boot ettiği, ardından §2 tablosunun 10 adımının **dist değil kaynak kodla** yeniden koşulduğu UAT tekrarı zorunludur.

> **ÇATIŞMA:** Rolümde dosya yazma yetkisi yoktur; BUG-01'i yerinde giderme müdahalesi yapılmamış, yalnızca doğrulama amaçlı bayat `dist` artefaktı ayrı süreçte çalıştırılmıştır (sistem kalıcı olarak eski haline döndürülebilir durumdadır).
