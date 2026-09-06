# Güvenlik Tasarımı — elektriklioto.com (Faz 1)

> Sürüm: 1.0 · Tarih: 2026-09-06 · Sahip: Security Engineer
> Girdi: `proje_kapsami.md`, `teknik_mimari_dokumani.md`, `backlog.md`, `paket_secim_raporu.md`.
> Bu doküman **uygulanabilir kontrolleri** tanımlar. Tehdit senaryolarının kataloğu ve risk puanlaması ayrı dosyadadır (`tehdit_modeli.md`); burada "ne kuracağız, hangi kural, hangi kod noktası" yazılıdır.
> Kural: bir kontrol için paket raporunda **PAKET KULLAN** kararı varsa o paket kullanılır; sapma `// SAPMA:` yorumu ile kodda gerekçelendirilir.

---

## 1. Güvenlik Duruşu Özeti

| # | Karar | Tek satır gerekçe |
|---|---|---|
| S1 | **Anonim öncelikli kimlik**: parola yok, e-posta yok, cihaz bazlı opak token | Toplanmayan veri sızmaz; KVKK yüzeyi asgaride kalır |
| S2 | **Token = kısa ömürlü JWT (15 dk) + rotasyonlu refresh**, cihaz attestation ile bağlanır | Çalınan token'ın ömrü sınırlı, iptal edilebilir |
| S3 | **Yetkilendirme tek noktada**: her yazma rotası `preHandler` ile `deviceScope` kontrolünden geçer | Rota bazlı unutulan kontrol sınıfı ortadan kalkar |
| S4 | **Kötüye kullanım savunması katmanlı**: attestation → oran limiti → güven skoru → ağırlıklı skor | Tek katman atlatılınca sistem çökmez |
| S5 | **Koordinat sunucuya hiç gelmez** (`proximity_proof` HMAC) | Zorunlu konum kısıtı "silme politikası" ile değil, "toplamama" ile sağlanır |
| S6 | **Sır yönetimi ortam değişkeni + zod şeması**, eksik/hatalı değişkende süreç başlamaz | Yanlış yapılandırmayla üretime çıkmak imkânsız |
| S7 | **Yönetim ekranı ayrı kimlik alanı** (personel SSO/OIDC), cihaz token'ı ile erişilemez | Ayrıcalık yükseltme yolu kapalı |

---

## 2. Kimlik Doğrulama (Authentication)

### 2.1 Son kullanıcı — anonim cihaz kimliği

**Akış:**
1. İlk açılışta istemci `POST /api/v1/devices/register` çağırır; gövdede platform attestation kanıtı (`Play Integrity` token / `App Attest` assertion) taşır.
2. Sunucu attestation'ı doğrular, `device_id` (UUIDv7, opak) üretir, `device_trust` skoru başlangıç değeri atar.
3. Yanıt: `access_token` (JWT, **TTL 15 dk**) + `refresh_token` (opak 256-bit rastgele, **TTL 30 gün**, DB'de yalnızca `sha256` özeti saklanır).
4. Yenileme `POST /api/v1/devices/token` ile yapılır; **refresh rotasyonu zorunlu** — kullanılan refresh iptal edilir, yenisi verilir. Aynı refresh ikinci kez kullanılırsa (yeniden kullanım tespiti) o cihazın **tüm** token zinciri iptal edilir ve `security_event` yazılır.

**Kurallar (uygulanabilir):**
- JWT imzası **EdDSA (Ed25519)**, `packages/config` üzerinden gelen özel anahtarla; `alg` istemciden asla okunmaz, doğrulayıcı `algorithms: ['EdDSA']` ile sabitlenir (`alg:none` ve HS/RS karışıklığı kapalı).
- JWT claim seti: `sub=device_id`, `iss=https://api.elektriklioto.com`, `aud=elektriklioto-app`, `iat`, `exp`, `jti`, `tv` (token version). `iss`/`aud`/`exp` **hepsi** doğrulanır; biri eksikse 401.
- JWT içine **hiçbir PII, koordinat veya konum türevi** konmaz.
- Token'lar `Authorization: Bearer` başlığıyla taşınır; sorgu parametresinde token kabul eden hiçbir uç yoktur (URL log'a düşer).
- Mobilde `refresh_token` **`flutter_secure_storage`** (paket raporu §3) ile Keychain/Keystore'da saklanır; `SharedPreferences`/Hive'a yazılması yasaktır — CI'da grep kuralı ile kontrol edilir.
- Web'de anonim token **yalnızca favori/bildirim** özellikleri için üretilir ve `httpOnly; Secure; SameSite=Lax` çerezde tutulur; `localStorage` kullanılmaz (XSS'te sızmasın).
- Attestation doğrulanamayan cihaz **reddedilmez**, `device_trust = 'unverified'` ile kaydedilir; okuma tam çalışır, yazma uçlarında kotası 1/10 seviyesine iner (bkz. §4.2). Bu, emülatör/rootlu cihaz kullanıcısını dışlamadan kötüye kullanımı ekonomik olarak anlamsızlaştırır.

**Paket kararı:** JWT üretimi/doğrulaması için **`@fastify/jwt`** (MIT, Fastify org) kullanılır — paket raporunda listelenmemiş bir yetenektir; rapordaki "varsayılan tercih hazır pakettir" kuralı gereği kendi imzalama kodumuzu yazmayız.
`proximity_proof` HMAC'i için rapor **KENDİMİZ YAZ** demiştir (`node:crypto`) — o karara uyulur.

### 2.2 Anonim kullanım (token'sız) yüzeyi

`GET /stations`, `/stations/:uid`, `/availability`, `/catalog/*`, `/deeplink/:socketId`, `/events/availability` **token istemez** (US-H1/AC1). Bu uçlarda savunma tamamen oran limiti + önbellek + girdi doğrulamasıdır.

### 2.3 Personel / yönetim ekranı

- Entity resolution çözüm ekranı (US-G2), görsel moderasyon kuyruğu (US-E3) ve kaynak sağlığı paneli (US-F3) **ayrı bir kimlik alanındadır**: kurumsal OIDC sağlayıcı (Google Workspace) ile `authorization_code + PKCE`.
- Personel oturumu `httpOnly` çerez, **TTL 8 saat**, idle timeout 30 dk.
- **MFA zorunlu** (OIDC sağlayıcı seviyesinde zorlanır).
- Yönetim uçları `/api/v1/admin/*` altındadır ve **cihaz JWT'si ile 403 döner** — iki kimlik alanı asla birbirine geçmez; bu, sözleşme testinde her admin rotası için negatif test ile doğrulanır.
- Admin arayüzü `admin.elektriklioto.com` altındadır ve IP allow-list (ofis/VPN) arkasındadır.

> **Varsayım:** Kurumsal kimlik sağlayıcı olarak Google Workspace mevcuttur. Değilse aynı akış herhangi bir OIDC sağlayıcıya kurulabilir; bu bir **KURULUM GEREKİYOR** kalemidir.

---

## 3. Yetkilendirme (Authorization)

### 3.1 Rol modeli (minimal, üç rol)

| Rol | Kaynak | Yetki |
|---|---|---|
| `anonymous` | token yok | Tüm okuma uçları |
| `device` | cihaz JWT | + `POST /reports`, `GET/PUT /favorites`, `DELETE /device`, `POST /handoff` |
| `staff` | OIDC oturumu | + `/api/v1/admin/*` (resolution, moderasyon, kaynak sağlığı) |

`staff` içinde alt ayrım: `staff:moderator` (görsel onay, arıza etiketi geri alma) ve `staff:admin` (deep-link konfigürasyonu, `source_policy` değişikliği). Deep-link konfigürasyonu **kod çalıştırmayan ama kullanıcıyı yönlendiren** bir yüzeydir; bu yüzden en dar role bağlıdır.

### 3.2 Nesne seviyesi yetkilendirme (IDOR savunması)

Kritik kural: **cihaz token'ına bağlı hiçbir kaynak, istemciden gelen bir kimlikle sorgulanmaz.**

- `GET/PUT /favorites` gövdesinde veya yolunda `device_id` **yer almaz**; sunucu `request.user.sub` kullanır. Şema testi: favori uçlarının request şemasında `device_id` alanı varsa build kırılır.
- `DELETE /device` yalnızca token sahibinin kendi kaydını siler; parametre almaz.
- `POST /reports` içinde `device_id` gönderilemez.
- Tüm SQL sorguları `drizzle-orm` üzerinden parametriktir; `sql.raw` kullanımı `dependency-cruiser` + ESLint kuralı ile yasaklanır, istisna gerekiyorsa `// SAPMA:` yorumu ve güvenlik gözden geçirmesi zorunludur.

### 3.3 Zorlama noktası

Yetkilendirme rota tanımında değil, **tek bir Fastify plugin'inde** yapılır:

```ts
// apps/api/src/plugins/auth.ts
// Her rota `config.auth` bildirmek ZORUNDA; bildirmeyen rota kayıt anında hata verir.
fastify.addHook('onRoute', (route) => {
  if (!route.config?.auth) throw new Error(`auth policy missing: ${route.method} ${route.url}`)
})
```

Bu "fail-closed by default" kuralı, yeni bir uç eklerken yetkilendirmeyi unutmayı **derleme/başlatma hatası** haline getirir.

---

## 4. Kötüye Kullanım Senaryoları ve Karşı Önlemler

### 4.1 Sahte arıza bildirimi (en yüksek etkili senaryo)

Hedef: US-E2/AC1 — hatalı kapatma oranı ≤ %3. Kontrol katmanları:

1. **Yakınlık kanıtı:** `proximity_proof = HMAC-SHA256(server_key, nonce ‖ station_uid ‖ distance_bucket)`. Nonce `GET /reports/nonce` ile alınır, **TTL 120 sn**, tek kullanımlık (kullanılan `jti` DB'de tutulur), `device_id`'ye bağlıdır. `distance_bucket` yalnızca `<50m` değerini alabilir; başka değerle gelen istek 422.
2. **Cihaz oran limiti:** aynı cihaz + aynı istasyon → 24 saatte 1 sayılan bildirim (US-E2/AC2). Fazlası kabul edilir ama `counted=false` ile yazılır (kullanıcıya hata gösterilmez, sayıma girmez).
3. **Global cihaz kotası:** cihaz başına 24 saatte en fazla 10 bildirim; aşımda 429.
4. **Güven ağırlığı:** bildirim skoru cihazın `device_trust` değeriyle ağırlıklanır — `attested` = 1.0, `unverified` = 0.2, `flagged` = 0.0. Etiketleme eşiği ağırlıklı toplam üzerinden hesaplanır, ham sayı üzerinden değil.
5. **Farklı cihaz çeşitliliği şartı:** bir istasyonun "Arızalı" etiketlenmesi için en az **3 farklı** `device_id` ve bunların en az 2'sinin `attested` olması gerekir. Tek cihaz, kaç bildirim gönderirse göndersin istasyon kapatamaz.
6. **Otomatik geri alma:** arıza etiketi **TTL 6 saat**; kaynak verisi istasyonu `available` bildirirse etiket anında düşer. Kalıcı kapatma yalnızca `staff:moderator` kararıyla olur.
7. **Anomali alarmı:** aynı /24 IP bloğundan 10 dk içinde 5+ farklı cihazın aynı istasyona bildirimi → `security_event` + o istasyonun etiketi otomatik askıya alınır, moderatör kuyruğuna düşer.

### 4.2 Otomatik istemci / veri kazıma (bizim API'mize karşı)

Kendi verimiz kazınabilir bir yüzeydir; hedef engellemek değil, maliyetli hale getirmektir.

- **`@fastify/rate-limit` 11.2.0** (paket raporu §1) ile kademeli kota:

| Uç grubu | Anahtar | Kota |
|---|---|---|
| `GET /stations`, `/availability` | IP + `device_id` (varsa) | 120 istek / dk |
| `GET /catalog/*`, `/stations/:uid` | IP | 300 istek / dk (CDN önde) |
| `POST /reports` | `device_id` | 10 / 24 saat, 3 / dk |
| `POST /devices/register` | IP | 20 / saat, /24 blok başına 100 / saat |
| `POST /handoff` | IP | 30 / saat |
| `/api/v1/admin/*` | oturum | 600 / dk |

- **Bbox alan sınırı:** `GET /stations` isteğinde bbox alanı belirli bir eşiği (≈ 250.000 km²) aşarsa 422 — "tüm Türkiye'yi tek istekte çek" yolu kapatılır. Bu aynı zamanda p95 hedefinin koruyucusudur.
- **`since` zorunluluğu** (US-A2/AC1) tam geçmiş dökümünü engeller; `since` en fazla 24 saat geriye gidebilir, ötesi 422.
- **Kota aşımında** `429` + `Retry-After`; `@fastify/rate-limit` sayaçları paket raporunun "ek broker yok" kısıtı gereği **PostgreSQL destekli store** ile paylaşılır (`lru-cache 11.5.2` yalnızca süreç içi ön katman olarak kullanılır).
- Aşırı kullanan `device_id` otomatik `flagged` işaretlenir; okuma devam eder, yazma durur.

### 4.3 Deep-link kötüye kullanımı (açık yönlendirme)

Deep-link konfigürasyonu backend'den geldiği için **konfigürasyon zehirlenmesi = kullanıcıyı keyfi URL'ye yönlendirme** demektir.

- Operatör şemaları **allow-list**tir: `scheme` alanı yalnızca `{zes, trugo, esarj, ...}` sabit kümesinden; `https` fallback host'u `operator_domain_allowlist` tablosunda kayıtlı domain olmak zorunda.
- Şablon değişkenleri yalnızca `{station_uid}`, `{socket_id}`, `{connector_type}` olabilir; ikame edilen değerler **URL-encode** edilir ve `^[A-Za-z0-9_\-.:]{1,64}$` deseni ile doğrulanır — şema enjeksiyonu (`?x=1&redirect=evil`) kapatılır.
- Konfigürasyon değişikliği `staff:admin` yetkisi ister, `audit_log`'a yazılır ve **iki gözlü onay** gerektirir (öneren ≠ onaylayan).
- `GET /deeplink/:socketId` **302 döndürmez**, JSON içinde hedefi döndürür; yönlendirme kararını istemci verir. Böylece bizim domain'imiz açık yönlendirici (open redirect) olarak kullanılamaz.

### 4.4 Handoff kodu (web→mobil köprüsü)

- Kod: 128-bit `crypto.randomBytes` → base32 (tahmin edilemez, sıralı değil).
- **TTL 10 dk, tek kullanımlık** (US-D4/AC2); ikinci kullanımda 410.
- Payload yalnızca rota geometrisi + `station_uid` listesi; **kullanıcı kimliği, device_id, IP taşımaz** — şema testi ile doğrulanır.
- `GET /handoff/:code` kaba kuvvete karşı IP başına 60/saat; 10 başarısız denemeden sonra o IP 15 dk `429`.
- Kullanıldıktan veya süresi dolduktan sonra kayıt **silinir** (soft-delete yok).

### 4.5 Kullanıcı üretimli içerik (yorum, görsel)

- Metin: sunucuda uzunluk sınırı (yorum ≤ 500 karakter), kontrol karakterleri strip. Depolama **ham metin**; kaçış **render anında** yapılır. Nuxt tarafında `v-html` kullanımı **yasak** (ESLint `vue/no-v-html` hata seviyesi), Flutter'da metin `Text` widget'ı ile — HTML render edilmez.
- Görsel: yükleme `POST /uploads` ile **presigned** olarak; sunucu MIME'ı istemciye güvenmeden magic-byte ile doğrular (`image/jpeg|png|webp`), boyut ≤ 8 MB, `sharp` benzeri yeniden kodlama ile EXIF **tamamen strip** edilir — **EXIF GPS verisi konum kısıtının en sinsi ihlal yoludur, bu adım pazarlık dışıdır**.
- Görseller `cdn.elektriklioto.com` altında rastgele isimle saklanır, orijinal dosya adı kullanılmaz. Onaylanmadan hiçbir yolla erişilemez (US-E3/AC1) — onay bekleyen nesne farklı, erişimi kapalı bir prefix'te durur.

### 4.6 Giden istek güvenliği (ingestion / SSRF)

Worker dış kaynaklara HTTP isteği atar; kaynak URL'leri **konfigürasyondan** gelir.

- Connector hedef URL'leri `source_policy` tablosundaki **allow-list**ten okunur; çalışma zamanında kullanıcı girdisinden URL üretilmez.
- DNS çözümlemesi sonrası IP kontrolü: özel/loopback/link-local aralıklara (`10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `::1`, `fc00::/7`) çıkış **reddedilir** — bulut metadata uçları (`169.254.169.254`) dâhil.
- Yönlendirme takibi en fazla 3, her adımda aynı IP kontrolü tekrarlanır.
- Yanıt boyutu tavanı 25 MB, `undici` timeout 20 sn; JSON şeması `zod` ile doğrulanmadan kanonik katmana geçilmez (ham katmana yazılır — mimari §7).
- Proxy kimlik bilgileri ortam değişkeninden; log'a asla yazılmaz.

---

## 5. Veri Gizliliği (KVKK / GDPR)

### 5.1 Konum — "toplama, silme sorunun olmasın"

Zorunlu kısıt gereği kullanıcıya bağlı koordinat **hiçbir katmanda** tutulmaz. Zorlama noktaları:

| Katman | Kontrol |
|---|---|
| API şeması | `POST /reports`, `PUT /favorites`, `POST /handoff` istek şemalarında `lat`/`lon`/`geometry` alanı **yok**; `additionalProperties: false` ile ekstra alan reddedilir |
| Veritabanı | Şema testi: `fault_report`, `favorites`, `device`, `handoff` tablolarında `geometry`/`geography` tipinde sütun bulunursa test kırılır (US-H1/AC2) |
| Log | `pino` redaksiyon listesi: `req.query.bbox`, `req.query.lat`, `req.query.lon`, `req.headers.authorization`, `req.body.proximity_proof`. Erişim log'unda **tam URL değil, rota şablonu** (`/stations?bbox=…` → `/stations`) yazılır |
| CDN / reverse proxy | Erişim log'unda query string kapalı; IP `X-Forwarded-For` **son okteti maskeli** (`85.105.12.0`) saklanır |
| Görsel | EXIF strip (§4.5) |
| Analitik | Üçüncü taraf analitik SDK'sı **kullanılmaz**; olay sayaçları sunucu tarafı `/metrics` üzerinden toplanır, kullanıcı kimliği taşımaz |

### 5.2 İşlenen kişisel veri envanteri

| Veri | Hukuki dayanak | Saklama | Silme |
|---|---|---|---|
| `device_id` (opak) | Meşru menfaat (hizmetin işleyişi) | Aktif kullanımda + 90 gün hareketsizlik | Hareketsizlikte otomatik purge |
| Refresh token özeti | Meşru menfaat | TTL 30 gün | Süre dolunca silinir |
| Push token (APNs/FCM) | **Açık rıza** (bildirim izni) | İzin geri alınana kadar | İzin kalkınca anında silinir |
| Favoriler (`device_id` + `station_uid`) | Meşru menfaat | Cihaz kaydı süresince | `DELETE /device` ile anında |
| Arıza bildirimi (`device_id`, `station_uid`, zaman) | Meşru menfaat | Ham kayıt 180 gün, sonra `device_id` NULL | 180 gün otomatik anonimleştirme + `DELETE /device` ile anında NULL |
| Erişim log'u (maskeli IP, rota, durum) | Meşru menfaat (güvenlik) | **30 gün**, sonra silinir | Otomatik |
| `security_event` / `audit_log` | Meşru menfaat (güvenlik) | **1 yıl** | Otomatik |
| Görsel (onaylı) | Açık rıza (yükleme anında) | Yayında kaldığı sürece | Kullanıcı talebiyle silinir |
| Personel OIDC kimliği (e-posta) | Sözleşme/istihdam | İşten ayrılışa kadar | Erişim iptali ile |

**Toplanmayanlar (açıkça):** ad-soyad, telefon, doğum tarihi, araç plakası, geçmiş güzergah, ziyaret geçmişi, reklam kimliği (IDFA/GAID).

### 5.3 Veri sahibi hakları

- **Silme:** `DELETE /device` — favoriler ve push ilişkisi kalıcı silinir, `fault_report.device_token` NULL'lanır (US-H3). SLA: **anında** (senkron), 30 gün değil.
- **Erişim/taşınabilirlik:** `GET /device/export` — cihaza bağlı tüm kayıtları JSON olarak döndürür. Bu uç `device` rolüne bağlıdır ve saatte 2 istekle sınırlıdır.
- Hesap olmadığı için "düzeltme" hakkı yalnızca favori listesi üzerinden; ayrı bir akış gerekmez.
- Web'de KVKK Aydınlatma Metni ve Çerez Politikası `elektriklioto.com/kvkk` altında; **çerez banner'ı yalnızca zorunlu çerez kullanıldığı için "bilgilendirme" formatındadır** (izin bariyeri değil) — üçüncü taraf takip çerezi yoktur.

### 5.4 Yasal konumlandırma güvencesi

Zorunlu kısıt: platform "Lisanslı Şarj Operatörü" değildir. Güvenlik açısından bunun karşılığı **içerik kontrolüdür**:
- Tarife gösterilen her yüzeyde `source` + `fetched_at` + "bilgi amaçlıdır, bağlayıcı değildir" ibaresi **şablon seviyesinde zorunlu**; tarife bileşeni bu alanlar boşken render edilmez (bileşen testi).
- Uygulama ve web metinlerinde "şarj satışı", "operatörümüz", "bizim istasyonlarımız" ifadeleri CI'da yasaklı sözlük taraması ile engellenir.

---

## 6. Aktarım, Depolama ve Sır Yönetimi

- **TLS 1.2+ zorunlu** (1.3 tercihli), tüm alt alan adlarında HSTS `max-age=31536000; includeSubDomains; preload`.
- Mobilde `api.elektriklioto.com` için **sertifika pinning** (SPKI pin, en az 2 pin: aktif + yedek); pin süresi 90 gün, uzaktan kapatılabilir kill-switch ile — yanlış pin uygulamayı tuğlalaştırmasın.
- **`@fastify/helmet`**: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy: geolocation=(self)`.
- **CSP (Nuxt):** `default-src 'self'; script-src 'self'; connect-src 'self' https://api.elektriklioto.com <tile-host>; img-src 'self' https://cdn.elektriklioto.com data: blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`. Satır içi script yalnızca nonce ile (JSON-LD dâhil).
- **CORS:** allow-list `https://elektriklioto.com`, `https://www.elektriklioto.com`; `credentials: true`; wildcard yasak. Mobil istemci Origin göndermez, etkilenmez.
- **Sırlar:** `packages/config` içindeki `zod` şeması tüm gizli değişkenleri zorunlu kılar; eksikse süreç başlamaz. `.env` dosyaları `.gitignore`'da, `gitleaks` pre-commit + CI taraması. Harita tile anahtarı ve APNs/FCM kimlikleri **istemci derlemesine gömülmez**; harita anahtarı için `GET /config/map-token` ile kısa ömürlü, domain/paket-adı kısıtlı token dağıtılır.
- **Anahtar rotasyonu:** JWT imzalama anahtarı 90 günde bir, HMAC `proximity_proof` anahtarı 30 günde bir rotasyona girer; iki nesil anahtar aynı anda geçerli tutulur (overlap penceresi).
- **Şifreleme:** disk düzeyinde at-rest şifreleme (yönetilen disk/volume). Uygulama seviyesinde sütun şifrelemesi **yok** — çünkü hassas alan tutulmuyor; push token'ları hariç, onlar da opak.
- **Yedekler:** `pg_dump` + WAL arşivi şifreli depolanır; yedek erişimi `staff:admin` ile sınırlı, geri yükleme tatbikatı sürüm öncesi.

---

## 7. Tedarik Zinciri Güvenliği

- Tüm npm ve Dart bağımlılıkları **tam sürüm** sabitli (paket raporu §7); `pnpm-lock.yaml` ve `pubspec.lock` depoda.
- CI'da `pnpm audit --audit-level=high` **kapı**; kritik/yüksek açık varsa build kırılır. `flutter pub outdated`/`dart pub audit` haftalık raporlanır.
- `pnpm config set ignore-scripts=true` — kurulum script'leri varsayılan kapalı; ihtiyaç duyan paketler (`@openapitools/openapi-generator-cli`) açık listeye alınır.
- `openapi-generator` jar'ı **SHA-256 doğrulaması** ile kullanılır; jar sürümü sabit.
- CI'da SBOM (CycloneDX) üretilir ve sürüm artefaktına eklenir; lisans taraması `BlueOak-1.0.0` beyaz listesi ile (paket raporu §1 uyarısı).
- Üretilen istemci kodları (`packages/contracts`, `mobile/lib/api/generated/`) elle düzenlenemez; `git diff --exit-code` kapısı (US-I1/AC2) aynı zamanda bir tedarik zinciri kontrolüdür — üretilmiş koda gizli değişiklik sokulamaz.
- Docker imajı sürüm sabitli (`postgis/postgis:16-3.4`), digest ile pinlenir; `trivy` ile imaj taraması CI'da koşar.

---

## 8. Gözlemlenebilirlik ve Olay Müdahalesi

**`security_event` tablosu** (partition'lı, 1 yıl saklama) şu olayları yazar: refresh yeniden kullanım tespiti, attestation başarısızlığı, kota aşımı serisi, SSRF blok kararı, admin yetki reddi, deep-link konfigürasyon değişikliği, toplu arıza bildirimi anomalisi.

**`audit_log`** (değiştirilemez, append-only): her `staff` eylemi — kim, ne zaman, hangi kayıt, önceki/sonraki değer. Admin ekranındaki her yazma bu log'a düşmeden tamamlanmaz (transaction içinde).

**Alarm eşikleri:** 5 dk içinde 10+ refresh yeniden kullanımı → sayfa; herhangi bir SSRF bloğu → sayfa; tek istasyona 10 dk'da 20+ bildirim → moderatör bildirimi; `pnpm audit` kritik bulgu → sürüm dondurma.

**Müdahale araçları (Faz 1'de hazır olmak zorunda):**
1. `device_id` iptali (token zinciri geçersizleştirme) — admin ekranından tek tuş.
2. Uç nokta bazlı acil kota daraltma (konfigürasyon, deploy'suz).
3. Arıza etiketi toplu geri alma (istasyon veya zaman aralığı bazlı).
4. Deep-link konfigürasyonunu bilinen-iyi sürüme geri alma.

**Sızıntı bildirimi:** KVKK kapsamında ihlal tespitinden itibaren **72 saat** içinde Kurul'a bildirim; bildirim taslağı ve sorumlu iletişim zinciri `docs/ihlal_mudahale.md` altında hazır tutulur (Faz 1 çıkışından önce).

---

## 9. Faz 1 Güvenlik "Bitti Tanımı"

1. Her rota `config.auth` bildiriyor; bildirmeyen rota süreci başlatmıyor (§3.3 testi yeşil).
2. Şema testi doğruluyor: kullanıcıya bağlı hiçbir tabloda koordinat sütunu yok, istek şemalarında `lat`/`lon` alanı yok.
3. `proximity_proof` nonce tekrar kullanımı, süresi dolmuş nonce ve sahte HMAC için üç negatif test yeşil.
4. Admin uçlarının her biri için cihaz JWT'siyle 403 negatif testi yeşil.
5. SSRF koruması: `169.254.169.254` ve `127.0.0.1` hedefli connector konfigürasyonu birim testinde reddediliyor.
6. EXIF strip testi: GPS içeren JPEG yüklendiğinde çıktı dosyasında GPS tag'i yok.
7. `gitleaks` + `pnpm audit --audit-level=high` + `trivy` CI kapıları yeşil.
8. Rate-limit kotaları `autocannon` ile doğrulanmış (429 eşiği ölçülü).
9. `DELETE /device` sonrası veri kalıntısı testi: favori 0 kayıt, `fault_report.device_token` NULL, sayım bütünlüğü korunuyor.

---

## 10. Açıkta Kalanlar (KURULUM GEREKİYOR)

- **Kurumsal OIDC sağlayıcı** — personel kimliği için; tedarik edilene kadar admin ekranı yalnızca VPN + kısa ömürlü statik anahtarla erişilebilir olacak (geçici, Faz 1 çıkışından önce kapatılmalı).
- **Play Integrity / App Attest yapılandırması** — Google Play Console ve Apple Developer tarafında etkinleştirilmeli; yoksa tüm cihazlar `unverified` sayılır ve §4.1 çeşitlilik şartı `attested` gereksinimi geçici olarak "3 farklı cihaz" ile karşılanır.
- **Harita tile anahtarı** — `GET /config/map-token` uç noktası bu anahtar olmadan çalışmaz.
- **Sır saklama servisi** — Faz 1'de ortam değişkeni yeterlidir; birden fazla ortam çıktığında yönetilen bir secret store'a taşınmalıdır.
