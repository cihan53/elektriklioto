# Tehdit Modeli — elektriklioto.com (Faz 1)

> Sürüm: 1.0 · Tarih: 2026-09-06 · Sahip: Güvenlik / CTO
> Girdi: `proje_kapsami.md`, `teknik_mimari_dokumani.md`, `backlog.md`, `paket_secim_raporu.md`.
> Kapsam: Faz 1 varlıkları — `api.elektriklioto.com` (Fastify), `elektriklioto.com` (Nuxt SSR), `worker`, PostgreSQL+PostGIS, Flutter istemcisi, connector'ların dış kaynak trafiği.
> Bu doküman **tehdit ve kuralları** tanımlar; kontrollerin uygulama detayı `guvenlik_tasarimi.md` dosyasındadır.

---

## 1. Sistem Sınırları ve Güven Bölgeleri

| Bölge | Bileşen | Güven seviyesi |
|---|---|---|
| Z0 — Düşman | Flutter istemcisi, tarayıcı, `device_token` sahibi, herkese açık `/api/v1` | **Sıfır güven.** İstemciden gelen hiçbir iddia (mesafe, cihaz kimliği, filtre, uid) doğrulanmadan kabul edilmez. |
| Z1 — Yarı güvenilir | Dış CPO/açık veri kaynakları, harici routing servisi, harita karo sağlayıcı | Veri kirli varsayılır; connector çıktısı şema doğrulamadan kanonik katmana geçemez. |
| Z2 — Uygulama | `api`, `worker`, Nuxt SSR sunucusu | Güvenilir kod, güvenilmeyen girdi. SSR sunucusu API'ye iç ağdan gider. |
| Z3 — Veri | PostgreSQL+PostGIS, yedekler, WAL arşivi | En yüksek değer. Yalnızca Z2'den, parametrik SQL ile erişilir. |
| Z4 — Ops | CI/CD, ortam değişkenleri, yönetim ekranı (`resolution_conflict`), `/metrics` | Ayrıcalıklı. İnternete açık değildir; ayrı kimlik doğrulamaya tabidir. |

**Güven sınırı geçişleri (saldırı yüzeyi):** Z0→Z2 (`/api/v1`), Z1→Z2 (connector fetch), Z2→Z3 (SQL), Z4→Z2/Z3 (deploy + migration), Z0→Z2 (görsel yükleme), Z0→Z0 (deep-link ile üçüncü taraf uygulamaya devir).

---

## 2. Tehdit Kaydı (STRIDE)

Her satır: tehdit → gerçekleşme senaryosu → **uygulanabilir kural**. Şiddet: K(ritik)/Y(üksek)/O(rta)/D(üşük).

### 2.1 Kimlik Sahtekârlığı (Spoofing)

| # | Tehdit | Şid. | Kural |
|---|---|---|---|
| T-S1 | Saldırgan `device_token`'ı kendi üretir veya başkasınınkini yeniden oynatır; favorileri okur, adına bildirim yapar | Y | `device_token` **istemci tarafından üretilemez**: `POST /devices` sunucuda 128-bit CSPRNG opak UUID üretir. İstek kimliği taşıyıcı token değil, `Authorization: Bearer <token>` + `X-Device-Ts` + `X-Device-Sig = HMAC-SHA256(device_secret, method|path|body_sha256|ts)`. `device_secret` yalnızca kayıt yanıtında bir kez döner, `flutter_secure_storage`'da (iOS Keychain / Android Keystore) tutulur. `|now - ts| > 120 sn` → 401. Ham token'ı taşıyan istek yazma uçlarında kabul edilmez. |
| T-S2 | Emülatör/rootlu cihaz farmı ile binlerce sahte cihaz kaydı | Y | `POST /devices` **Play Integrity / App Attest attestation'ı zorunlu** ister; doğrulama sunucuda yapılır (nonce sunucudan alınır, tek kullanımlık, 60 sn TTL). Attestation başarısız → cihaz oluşur ama `device_trust = 0`; `trust = 0` cihazlar bildirim sayımına **katılmaz** (kayıt kabul edilir, ağırlığı sıfırdır — saldırgana geri bildirim verilmez). |
| T-S3 | Web istemcisi taklidi: doğrudan `curl` ile yazma uçlarına istek | O | Yazma uçları (`/reports`, `/handoff`, `PUT /favorites`, `DELETE /device`) yalnızca imzalı cihaz kimliğiyle çalışır; web'de yazma uçları **yoktur** (web salt-okunur + `/handoff` üretimi). `/handoff` üretimi Turnstile benzeri bot kontrolü + IP kotasıyla korunur. |
| T-S4 | Sahte `elektriklioto.com` alan adı / kimlik avı ile deep-link kaçırma | O | Universal Link / App Link `assetlinks.json` ve `apple-app-site-association` yalnızca `elektriklioto.com` altında yayınlanır; mobil tarafta `flutter_secure_storage` dışına kimlik yazılmaz. Marka koruma: alan adı benzerlerinin izlenmesi ops görevi. |

### 2.2 Değiştirme (Tampering)

| # | Tehdit | Şid. | Kural |
|---|---|---|---|
| T-T1 | SQL enjeksiyonu — `bbox`, `operator`, `uid`, sıralama alanları üzerinden | K | **Tüm SQL parametrik** (`postgres.js` template literal / `drizzle-orm`). Dinamik tablo/kolon adı, `ORDER BY` ve `LIMIT` yalnızca beyaz liste sabitinden seçilir; string birleştirme ile SQL üretmek `dependency-cruiser` + lint kuralıyla yasaktır. `bbox` zod ile 4 sayıya parse edilir; `-180≤lon≤180`, `-90≤lat≤90`, alan ≤ 4 derece² değilse 400. |
| T-T2 | Kirli kaynak verisi kanonik katmanı bozar (dev negatif kW, HTML enjeksiyonu, 0,0 koordinatı) | Y | Connector `normalize()` çıktısı **zod şemasıyla doğrulanmadan** `station_draft` üretemez: `power_kw ∈ [1, 1000]`, koordinat Türkiye bbox'ı içinde (`25.5–45.0 lon`, `35.5–42.5 lat`), soket tipi enum. Doğrulama hatası kaydı `raw_station_snapshot`'ta bırakır, `source_health.rejected` sayacını artırır, kanonik yazma yapılmaz. |
| T-T3 | Kötü niyetli kullanıcı topluluğu ile istasyonu haksız yere "arızalı" ilan etme (rakip CPO sabotajı) | K | Bkz. §3 — Kötüye Kullanım Modeli, AB-1. Tek cihaz asla eşiği tetikleyemez. |
| T-T4 | Yönetim ekranından hatalı/ kötü niyetli `station_uid` birleştirme | Y | `resolution_conflict` çözümleri **geri alınabilir olmak zorundadır**: `merged_into` tombstone + `resolution_audit(actor, before, after, at)`. `station_uid` hiçbir koşulda UPDATE edilmez; birleştirme yalnızca tombstone yazar. Yönetim ekranı Z4'tedir, tek kişilik değişiklik 24 saat içinde geri alınabilir. |
| T-T5 | Üretimde elle DDL ile şema bozulması | Y | *(zorunlu kısıt)* Uygulama DB rolü **DDL yetkisiz**: `api_rw` rolünde `CREATE/ALTER/DROP` yoktur; DDL yalnızca deploy adımının kullandığı ayrı `migrator` rolüyle, `node-pg-migrate` dosyaları üzerinden çalışır. `pg-boss` `migrate:false` ile açılır (paket raporu §5.2) — kendi şemasını çalışma zamanında oluşturamaz. |
| T-T6 | Üretilen istemci kodunun/`openapi.json`'un elle değiştirilmesiyle sözleşme kayması | O | CI `git diff --exit-code` kapısı (US-I1). Bu bir güvenlik kapısıdır: elle düzenlenmiş DTO, sunucu doğrulamasıyla uyuşmayan istemci varsayımı üretir. |

### 2.3 İnkâr (Repudiation)

| # | Tehdit | Şid. | Kural |
|---|---|---|---|
| T-R1 | "Bu istasyonu ben arızalı bildirmedim" / kötüye kullanımın izlenememesi | O | Her `fault_report` kaydı `device_token_hash` (HMAC, pepper ile), `created_at`, `trust_at_time`, `nonce_id` taşır. **Ham koordinat taşımaz.** Silme talebinde `device_token_hash` NULL'lanır, sayım korunur (US-H3/AC2). |
| T-R2 | Ops eyleminin (birleştirme, görsel onayı, istasyon gizleme) izi kalmaması | O | Z4'teki her yazma `ops_audit(actor_id, action, target, payload_hash, at)` tablosuna yazılır; bu tablo append-only, `api_rw` rolü için `DELETE/UPDATE` yetkisi yoktur. |

### 2.4 Bilgi İfşası (Information Disclosure) — **en yüksek öncelik**

| # | Tehdit | Şid. | Kural |
|---|---|---|---|
| T-I1 | Kullanıcının konum geçmişinin dolaylı yoldan oluşması (loglar üzerinden) | **K** | *(zorunlu kısıt)* `pino` redaksiyon listesi: `req.query.bbox`, `lat`, `lon`, `location`, `proximity_proof`, `authorization`, `x-device-sig`, `set-cookie`. Erişim logunda **tam URL yazılmaz**, yalnızca route şablonu (`GET /stations`) + status + süre. CDN/ters vekil erişim logları da query-string'siz formatla yapılandırılır. Bu kural CI'da log-snapshot testiyle doğrulanır. |
| T-I2 | Şemaya sonradan konum sütunu sızması (`favorites.last_seen_geom` gibi "faydalı" bir alan) | **K** | *(zorunlu kısıt)* Şema testi: kullanıcı-bağlı tablo listesinde (`device`, `favorites`, `fault_report`, `handoff`, `push_subscription`) `geometry`/`geography` tipinde veya adı `lat|lon|coord|geom|route` ile eşleşen sütun bulunursa **build kırılır** (US-H1/AC2). Liste, yeni tablo eklendiğinde varsayılan olarak "kullanıcı-bağlı" kabul edecek şekilde `device_token` FK'sı taşıyan tüm tabloları otomatik tarar. |
| T-I3 | `/handoff` kodunun tahmin edilmesi → başkasının planladığı rotanın okunması | O | Kod = 128-bit CSPRNG, base32; DB'de yalnızca SHA-256 özeti saklanır. Tek kullanımlık, 10 dk TTL, ikinci kullanımda 410 (US-D4/AC2). Kod deneme oranı IP başına 10/dk ile sınırlıdır. Payload'da kimlik alanı bulunmaz (şema testi). |
| T-I4 | `/metrics`, `/healthz`, OpenAPI UI'ın internete açık kalması | Y | `/metrics` yalnızca iç ağdan (ayrı port veya IP allow-list) erişilir. `/readyz` migration sürümü gibi iç bilgiyi **gövdede döndürmez**, yalnızca 200/503. Swagger UI üretimde kapalıdır; `openapi.json` statik olarak yayınlanabilir (yüzey zaten kamuya açık). |
| T-I5 | Ayrıntılı hata mesajlarıyla stack trace / SQL sızıntısı | O | Üretimde hata gövdesi sabit şemadır: `{error: {code, message, request_id}}`. `message` sabit, kullanıcıya dönük metindir; `pg` hata kodu, tablo adı, sorgu metni asla gövdeye girmez — yalnızca `request_id` ile loga yazılır. |
| T-I6 | Sırların depoya/istemci derlemesine gömülmesi | Y | *(zorunlu kısıt)* Tüm sırlar `packages/config` zod şemasından okunur; şema dışı/eksik değişkenle süreç başlamaz. Harita karo API anahtarı **istemci derlemesine gömülmez**: web ve mobil karo isteklerini `api.elektriklioto.com/tiles/*` vekilinden alır (referrer/paket kısıtlı anahtar sunucuda kalır). CI'da `gitleaks` benzeri sır taraması PR kapısıdır. |
| T-I7 | Yedeklerin (`pg_dump`, WAL) korumasız durması | Y | Yedekler at-rest şifreli depoda, ayrı erişim kimliğiyle; geri yükleme tatbikatı üretim dışı ortamda yapılır ve tatbikat kopyası 24 saat içinde imha edilir. |
| T-I8 | Yorum/bildirim metninin başka kullanıcıya XSS olarak dönmesi | Y | Kullanıcı metni **saklanırken değil, sunulurken** kaçışlanır; Nuxt'ta `v-html` kullanımı lint ile yasaktır. CSP: `default-src 'self'; script-src 'self'; img-src 'self' https://cdn.elektriklioto.com data:; connect-src 'self' https://api.elektriklioto.com; frame-ancestors 'none'` (`@fastify/helmet` + Nuxt route rules). |

### 2.5 Hizmet Reddi (DoS)

| # | Tehdit | Şid. | Kural |
|---|---|---|---|
| T-D1 | Pahalı viewport sorgusuyla DB tüketimi (tüm Türkiye bbox + zoom 18) | Y | `bbox` alanı ≤ 4 derece² sınırı (T-T1); `zoom` ve `bbox` **tutarlılık kontrolü** — zoom < 10'da yalnızca grid agregasyonu döner, tekil pin sorgusu hiç çalışmaz. Her sorguda `statement_timeout = 2s`; `LIMIT` sunucu tarafında sabittir (maks 500 pin), istemci artıramaz. |
| T-D2 | İstek seli / ucuz döngüsel polling | O | `@fastify/rate-limit` (paket raporu): anonim IP 120 istek/dk; cihaz token'lı okuma 300/dk; yazma uçları 10/dk. `GET /availability` `since` zorunlu (US-A2/AC1) — tam tarama isteği mümkün değil. `ETag`/`s-maxage` ile CDN önü. |
| T-D3 | Görsel yükleme ile disk/bant genişliği tüketimi | O | Cihaz başına 5 görsel/gün, dosya ≤ 8 MB, yalnızca `image/jpeg|png|webp` (magic-byte kontrolü, uzantıya güvenilmez), sunucuda yeniden kodlanır (EXIF **tamamen** düşürülür — GPS EXIF'i T-I2'nin arka kapısıdır). |
| T-D4 | Kaynaklı DoS: connector'ın hedef CPO'yu ezmesi → IP engeli, veri akışının kesilmesi | Y | *(zorunlu kısıt)* `source_policy` tablosunda kaynak başına istek/dk kotası ve eşzamanlılık 1–2; `pg-boss` singleton kilidi ile aynı kaynak için paralel iş yasak; `429/503` → exponential backoff (2^n dk, tavan 60 dk, 8 denemede `dead`). `robots.txt`/ToS notu alanı boş olan kaynak için iş **çalıştırılmaz**. |
| T-D5 | SSR sunucusunun bot trafiğiyle şişmesi | O | Katalog rotaları ISR ile önbellekli; ISR dışı SSR isteklerine IP kotası; `sitemap.xml` dışı parametreli URL'ler (`?utm=`, rastgele filtre kombinasyonu) `noindex` + önbelleklenmez. |

### 2.6 Yetki Yükseltme (Elevation of Privilege)

| # | Tehdit | Şid. | Kural |
|---|---|---|---|
| T-E1 | IDOR: başka cihazın favorilerini/bildirimlerini okuma-silme | Y | Yetkilendirme **her sorgunun WHERE'inde**: `WHERE device_id = $auth.device_id`. Kaynak sahipliği uygulama katmanında ayrıca kontrol edilmez — sorgu sahiplik filtresi olmadan yazılamaz; bu kural `db` paketinde tek bir `ownedQuery()` yardımcısıyla zorlanır. Sahibi olmayan kaynak için 404 döner (403 değil — varlık sızdırmaz). |
| T-E2 | Yönetim ekranına (Z4) kimliksiz erişim | K | Yönetim ekranı ayrı alt alan adı, ayrı kimlik doğrulama (SSO/OIDC + zorunlu MFA), IP allow-list, `api_rw`'den farklı DB rolü. **Cihaz token'ı hiçbir koşulda ops yetkisi vermez** — iki kimlik sistemi ayrıdır, ortak token yüzeyi yoktur. Ops rolleri: `viewer` (salt okuma), `resolver` (birleştirme), `admin` (istasyon gizleme, kullanıcı verisi silme). |
| T-E3 | SSR sunucusunun ayrıcalıklı iç API'lere erişebilmesi (SSRF benzeri devir) | Y | SSR'ın kullandığı iç ağ kimliği **yalnızca kamuya açık okuma uçlarına** yetkilidir; iç ağ ≠ ayrıcalık. `/ops/*` ve `/metrics` yolları SSR kimliğine kapalıdır. |
| T-E4 | Bağımlılık zinciri saldırısı (kötü niyetli npm/pub sürümü) | Y | *(paket raporu §7)* Tüm sürümler tam sabitli (`pnpm add -E`), `pnpm-lock.yaml` ve `pubspec.lock` depoda; CI `pnpm install --frozen-lockfile`. Yükseltmeler yalnızca haftalık toplu PR ile, `pnpm audit` + lisans taraması kapısından geçerek. `postinstall` betikleri varsayılan olarak engellidir (`pnpm.onlyBuiltDependencies` allow-list). |
| T-E5 | Konteynerden host'a kaçış / gereksiz ayrıcalık | O | Postgres konteyneri root olmayan kullanıcıyla, yalnızca `127.0.0.1:5432`'ye bağlı çalışır; üretimde DB portu internete açılmaz. `api`/`worker` süreçleri ayrı sistem kullanıcısıyla, salt-okunur dosya sistemiyle koşar. |

---

## 3. Kötüye Kullanım Senaryoları (Abuse Cases)

Bunlar "hata" değil, **sistemin amaçlanan işlevinin silahlandırılmasıdır**; DoS'tan ayrı ele alınır.

**AB-1 — Rakip CPO sabotajı / koordineli sahte arıza kampanyası.** *(US-E2, başarı ölçütü ≤ %3 yanlış pozitif)*
Kural seti:
1. Bir istasyonun "Arızalı" etiketi **asla tek cihazla** tetiklenmez: en az 3 farklı `device_token`, her biri `device_trust ≥ 1` (attestation geçmiş), 6 saat içinde.
2. Aynı cihaz → aynı istasyon: 24 saatte 1 sayım (US-E2/AC2).
3. Aynı cihaz → tüm istasyonlar: 24 saatte 10 sayım; aşarsa cihazın **tüm** bildirimleri gölge-ağırlıklandırılır (`weight = 0`), kullanıcıya hata gösterilmez (saldırgana sinyal verilmemesi kasıtlıdır).
4. Cihaz yaşı < 24 saat → ağırlık 0.5; hesap-farmı ekonomisini bozar.
5. Bir istasyonda bildirim hızı taban çizgisinin 10 katını aşarsa etiket **otomatik uygulanmaz**, `ops_review` kuyruğuna düşer.
6. Etiket kalıcı değildir: en son bildirimden 24 saat sonra veya bir sonraki başarılı kaynak senkronizasyonu "available" derse otomatik düşer.
7. Operatörün itiraz kanalı: `/ops` üzerinden istasyon bazlı "etiket itirazı" kaydı; itiraz sonrası etiket ops onayına bağlanır.

**AB-2 — Veri kazıma: platformun kendi veri havuzunun toplu çalınması.**
Kural: `bbox` alan sınırı + sabit `LIMIT` + kota (T-D1/T-D2) toplu indirmeyi ekonomik olarak pahalılaştırır. Ek olarak: aynı IP/cihazın 1 saat içinde kapsadığı toplam benzersiz grid hücresi sayısı izlenir; eşiği aşan kaynak `ops_review`'a düşer. **Kabul:** kamuya açık veriyi %100 engellemek hedef değildir; hedef, tam kopyanın maliyetini yükseltmek ve tespit edilebilir kılmaktır.

**AB-3 — Deep-link'in kötüye kullanılması / açık yönlendirme.**
`GET /deeplink/:socketId` **istemciden gelen URL'i asla yansıtmaz**; yalnızca `deeplink_config` tablosundaki şablondan üretir. Şablon şeması ops tarafından girilirken beyaz listeden doğrulanır: izinli scheme'ler (`zes://`, `https://` + izinli host listesi) dışında değer kaydedilemez; `javascript:`, `data:`, `intent:` reddedilir. Bu kural, T-T4'ün (ops hesabı ele geçirilirse kitlesel kimlik avı) etkisini sınırlar.

**AB-4 — Yasal/konumlandırma riskinin kötüye kullanımı.** *(zorunlu kısıt: EMP statüsü)*
Platform hiçbir uçta ödeme, bakiye, tarife garantisi veya "şarj başlat" taahhüdü sunmaz. `tariff` alanları API yanıtında `source`, `fetched_at`, `confidence` **olmadan dönemez** (şema testiyle zorunlu) — fiyat sunumu daima kaynaklı ve zaman damgalıdır. Bu, hem sorumluluk yüzeyini hem "lisanslı operatör" izlenimini engeller.

**AB-5 — Görsel yükleme ile yasa dışı/rahatsız edici içerik dağıtımı.**
Manuel onay öncesi hiçbir görsel kamuya sunulmaz (US-E3/AC1). Onay bekleyen görseller **tahmin edilemez URL** ile bile olsa `cdn.` üzerinden servis edilmez; ayrı özel bucket'ta tutulur. Onaysız içerik için 24 saatlik kaldırma taahhüdü ve `abuse@elektriklioto.com` bildirim kanalı.

**AB-6 — Konum takibi için platformun araç olarak kullanılması.**
Sistem tasarım gereği bunu **yapamaz**: kullanıcıya bağlı koordinat kaydı yoktur (T-I2), log'da bbox yoktur (T-I1). Yasal talep gelse dahi teslim edilecek konum geçmişi mevcut değildir. Bu, mimari bir garantidir; politika değil.

---

## 4. Veri Sınıflandırması, Saklama ve Silme

| Veri | Sınıf | Saklama | Silme kuralı |
|---|---|---|---|
| `device_token` / `device_secret` | Kişisel veri sayılabilir tanımlayıcı (KVKK) | Cihaz aktifken; 180 gün hareketsizlikte otomatik silinir | `DELETE /device` → anında hard delete |
| Favoriler | Kişisel veri (cihaza bağlı) | Cihaz ömrü | Cihazla birlikte hard delete (US-H3/AC1) |
| `fault_report` | Sözde-anonim | 24 ay (aylık partition, partition drop ile) | Cihaz silinince `device_token_hash` → NULL (US-H3/AC2) |
| Push aboneliği (APNs/FCM token) | Kişisel veri | Abonelik ömrü; sağlayıcı "unregistered" dönerse anında | Cihazla birlikte |
| Kullanıcı görselleri | Kullanıcı üretimli içerik | Onaylıysa süresiz; reddedilirse 7 gün sonra imha | Talep üzerine 30 gün içinde |
| GPS koordinatı | **Saklanmaz** | 0 sn — yalnızca istemci belleğinde | Yok (hiç yazılmaz) |
| `bbox` / viewport | **Loglanmaz** | 0 | Yok |
| Erişim logları (route + status + süre + `request_id`) | Operasyonel | 30 gün | Otomatik rotasyon |
| `ops_audit` / `resolution_audit` | Denetim | 24 ay | Yasal saklama; kişisel veri içermez |
| `raw_station_snapshot` | Üçüncü taraf veri | 90 gün (aylık partition) | Partition drop |
| `handoff` kodu | Geçici | 10 dk | TTL + tek kullanım |
| Yedekler (`pg_dump` + WAL) | Karma | 30 gün | Rotasyon; silme talebi yedeklerde 30 gün gecikmeli tamamlanır (aydınlatma metninde beyan edilir) |

**KVKK/GDPR kuralları:**
- **Veri minimizasyonu bir tasarım kısıtıdır**, tercih değil: e-posta/telefon Faz 1'de yalnızca push izni + favori senkronizasyonu isteyen kullanıcıdan, ayrı ve açık rıza ile alınır; harita/detay/filtre işlevi hiçbir koşulda kimlik istemez.
- **Erişim ve taşınabilirlik:** `GET /device/export` cihaza ait tüm kayıtları (favoriler, bildirim sayısı, push aboneliği) JSON olarak döner; 30 günlük yasal süre içinde otomatik karşılanır.
- **Rıza kaydı:** push izni ve (varsa) e-posta rızası `consent(device_id, purpose, granted_at, version)` ile sürümlenmiş aydınlatma metnine bağlanır; metin değişirse rıza yeniden alınır.
- **Yurt dışına aktarım:** APNs/FCM ve harita karo sağlayıcısı yurt dışı aktarım oluşturur; aydınlatma metninde açıkça listelenir. **Karo isteklerinin sunucu vekili üzerinden geçmesi (T-I6) aynı zamanda kullanıcı IP'sinin karo sağlayıcısına gitmesini engeller** — bu bir gizlilik kontrolüdür, yalnızca sır saklama değil.
- **Veri ihlali:** tespit → 72 saat içinde KVKK Kurulu bildirimi; ihlal müdahale sorumlusu ve iletişim zinciri `guvenlik_tasarimi.md`'de tanımlıdır.

> **Varsayım:** Faz 1'de tüm işleme ve depolama AB/Türkiye bölgesinde konumlanmış tek bir bulut bölgesinde yapılacaktır; yurt dışı aktarım yalnızca yukarıda sayılan üç dış hizmetle sınırlıdır.

---

## 5. `proximity_proof` — Tehdit Analizi

Kısıt gereği ham koordinat sunucuya gitmez; bu, kanıtın **istemci tarafından üretilmesi** demektir ve doğal olarak zayıftır. Kabul edilen sınır ve kurallar:

- **Kabul:** Kanıt, tersine mühendislik yapabilen kararlı bir saldırgana karşı tek başına güvenlik sağlamaz. Görevi, kitlesel/otomatik sahte bildirimi pahalılaştırmaktır; asıl savunma AB-1'deki çoklu-cihaz + güven skoru katmanıdır.
- Nonce sunucudan alınır (`GET /reports/nonce`), tek kullanımlık, 5 dk TTL, `station_uid`'e bağlıdır — farklı istasyon için yeniden kullanılamaz.
- HMAC anahtarı sunucu tarafı sırdır; istemcide bulunan `device_secret` ile birlikte iki taraflı bağlanır (`HMAC(server_key, nonce|station_uid|distance_bucket|device_id)`), böylece kanıt cihazlar arası taşınamaz.
- `distance_bucket` yalnızca `{<50m}` enum değeridir; sürekli mesafe **gönderilmez** — aksi hâlde kova genişliği üzerinden konum kesinliği sızar.
- Nonce isteği de kotalıdır (cihaz başına 20/gün); nonce toplayıp toplu bildirim atma yolu kapalıdır.

---

## 6. Artık Riskler ve Kabul

| Risk | Neden kabul ediliyor | Azaltıcı |
|---|---|---|
| `proximity_proof` istemci tarafında sahtelenebilir | Zorunlu konum gizliliği kısıtının doğrudan sonucu | AB-1 çok katmanlı sayım; ≤ %3 yanlış pozitif ölçütü ile izlenir |
| Kamuya açık okuma verisi kazınabilir | Veri zaten kamuya açık kaynaklardan derleniyor | Kota + tespit (AB-2) |
| Tek Postgres örneği — kullanılabilirlik tek noktası | Faz 1 ölçek kararı (M4) | Günlük yedek + WAL; Faz 2 replika |
| Attestation atlatılabilir (rootlu cihaz, yeniden paketleme) | Mobil attestation mutlak değildir | `device_trust` ağırlıklandırma; sunucu tarafı oran limitleri |
| Yedeklerde silme 30 gün gecikmeli | WAL/point-in-time recovery gereği | Aydınlatma metninde beyan; yedek erişimi kısıtlı |
| Ops hesabının ele geçirilmesi | Tek kişilik yetki kaçınılmaz | MFA + IP allow-list + append-only `ops_audit` + geri alınabilir birleştirme (T-T4) |

---

## 7. Doğrulanabilir Güvenlik Kapıları (CI'da zorunlu)

Bu doküman soyut kalmasın diye, aşağıdakiler **build kıran** testlerdir:

1. **Konum şeması testi** — `device_token` FK'sı taşıyan hiçbir tabloda `geometry/geography` veya `lat|lon|coord|geom|route` adlı sütun yok (T-I2, US-H1/AC2).
2. **Log redaksiyon testi** — örnek istek seti koşturulur; üretilen log satırlarında `bbox|lat|lon|authorization|x-device-sig|proximity_proof` geçmez (T-I1).
3. **Payload şema testi** — `POST /reports` gövdesinde koordinat alanı reddedilir (400); `POST /handoff` yanıtı kimlik alanı içermez (US-D4/AC1, US-E1/AC1).
4. **Tarife alan testi** — `GET /stations/:uid` yanıtındaki her tarife kaydı `source`+`fetched_at`+`confidence` taşır (AB-4).
5. **Sahiplik testi** — cihaz A'nın token'ı ile cihaz B'nin favorisi/silmesi 404 döner (T-E1).
6. **Yetki testi** — `/ops/*` ve `/metrics` cihaz token'ıyla 404/401 döner (T-E2, T-I4).
7. **Bağımlılık kapısı** — `pnpm install --frozen-lockfile` + sır taraması + lisans beyaz listesi (T-E4, T-I6).
8. **DB rol testi** — `api_rw` rolüyle `CREATE TABLE` denemesi başarısız olur (T-T5).
9. **Kota testi** — yazma uçlarında 10/dk aşımında 429; `bbox` alanı > 4 derece² için 400 (T-D1, T-D2).
10. **Deep-link beyaz liste testi** — `javascript:`/`data:` şemalı şablon kaydedilemez (AB-3).
