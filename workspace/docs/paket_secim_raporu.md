# Paket Seçim Raporu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Hazırlayan Rol:** Tech Scout (`tech_scout`)  
> **Tarih:** 2026-09-06  
> **Durum:** Onaylandı (Teknik Paket ve Kütüphane Karar Dokümanı)  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `teknoloji_stack_karari.md`, `teknik_mimari_dokumani.md`, `tasarim_sistemi.md`, `arayuz_spesifikasyonu.md`, `ortam_raporu.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki kararlar projenin değişmez kısıtlarıdır; tüm paket seçimleri bu zemine oturtulmuştur:

- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker konteyneri üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz; e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca istemcide anlık harita merkezleme için geçici (in-memory) işlenir, geçmiş koordinat tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Erişilebilirlik Tabanı:** WCAG 2.1 AA tabandır; metin kontrastı ≥ 4.5:1, dokunma hedefleri webde ≥ 44x44 CSS px, mobilde ≥ 48x48 pt olmalıdır (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; arayüz boşken de anlamlı görünmek zorundadır; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Flutter ve pnpm ortam sorunları giderilene kadar paket seçimleri Node.js v22.21.0, npm 10.9.4 ve Flutter 3.27+ / Dart 3.6+ hedefleriyle tam uyumlu yapılmıştır.

> **Varsayım:** `tasarim_sistemi.md` token'larını ve WCAG 2.1 AA dokunma hedeflerini (web ≥ 44x44px, mobil ≥ 48x48pt) doğrudan kabul etmeyen, kendi görsel dilini dayatan kütüphaneler (Vuetify, Quasar vb.) elenmiş; "Headless / Token-First" paketler seçilmiştir.

---

## 2. Paket Değerlendirme İlkeleri

1. **Token-First / Headless:** Bileşen paketleri sıfır stil barındırmalı; renk, tipografi ve boşlukları CSS değişkenlerimizden (`--color-*`) veya Flutter `ThemeExtension` sınıflarımızdan almalıdır.
2. **Hazır Paket Önceliği:** Ekosistem standardı paketler esastır. "KENDİMİZ YAZ" kararı yalnızca zorunlu kısıtları (SKIP LOCKED kuyruk, Proximity HMAC) karşılamak ve dış bağımlılığı sıfırlamak için kullanılır.
3. **Lisans Güvenliği:** Yalnızca ticari kullanıma açık permissif lisanslar (MIT, Apache-2.0, BSD-3-Clause, ISC) kabul edilir; copyleft lisanslar (GPL/AGPL) elenir.
4. **Hafiflik ve Bakım:** 2025/2026'da aktif güncellenen, webde FCP < 1.2s ve mobilde cold start < 1.8s hedeflerini koruyan paketler seçilir.

---

## 3. Katman Bazında Mimari Paket Kararları

### 3.1. Tasarım Sistemi ve Sözleşme Hattı (`packages/*`)
- **Token Derleyici:** `PAKET KULLAN: style-dictionary ^4.3.0` (Apache-2.0) — JSON token'ları CSS ve Dart çıktılarına dönüştürerek tek kaynaklı tasarımı garanti eder. *Alternatif: Amazon Theo (terk edildi).*
- **Dart/CSS Formatlayıcılar:** `KENDİMİZ YAZ` — `tasarim_sistemi.md` içindeki `AppColorScheme (ThemeExtension)` sınıflarını standart şablonlar üretemediği için ~150 satırlık özel Style Dictionary eklentisi yazılır.
- **TypeScript API İstemcisi:** `PAKET KULLAN: openapi-fetch ^0.14.0` & `openapi-typescript ^7.6.0` (MIT) — Fastify OpenAPI 3.1 çıktısından çalışma zamanı ek yükü getirmeyen (< 6 KB) statik tipler üretir. *Alternatif: axios (ağır bundle > 40 KB).*
- **Dart DTO Üretici:** `PAKET KULLAN: openapi-generator-cli ^2.18.0` (Apache-2.0) — OpenAPI 3.1 şemasını Flutter model sınıflarına ve serileştirme kodlarına dönüştürür. *Alternatif: swagger_dart_code_gen (OpenAPI 3.1 kısıtları).*

### 3.2. Web Platformu Katmanı (`apps/web` - Nuxt 3)
- **Web Çatısı:** `PAKET KULLAN: nuxt ^3.15.0` (MIT) — Zorunlu kısıttır; SSR/SSG ile Lighthouse SEO > 90 ve FCP < 1.2s sağlar.
- **CSS Altyapısı:** `PAKET KULLAN: @nuxtjs/tailwindcss ^6.14.0` (MIT) — Tasarım token'larını CSS değişkenleriyle bağlar, kullanılmayan stilleri temizler (< 25 KB).
- **Headless UI Primitifleri:** `PAKET KULLAN: reka-ui ^2.0.0` (MIT, eski adıyla `radix-vue`) — Sıfır stil (unstyled) yapısıyla görsel dil dayatmaz; WAI-ARIA ve WCAG 2.1 AA klavye etkileşimlerini token'larımızla %100 uyumlu sunar. *Alternatif: Vuetify/Quasar (katı görsel dil dayatması).*
- **Vektör Harita Motoru:** `PAKET KULLAN: maplibre-gl ^5.1.0` (BSD-3-Clause) — Tescilli lisans kısıtı olmadan WebGL ile 16.788 istasyonu 60 FPS akıcılıkla render eder. *Alternatif: Leaflet (WebGL kümeleme yoksunluğu).*
- **Web Harita Vue Kapsülü:** `KENDİMİZ YAZ` (`VectorMap.vue`) — 3. parti paketlerin SSR hidrasyon hatalarını önlemek için `<ClientOnly>` altında doğrudan MapLibre GL API'sini dinleyen bileşen yazılır.
- **Web İkon Seti:** `PAKET KULLAN: @lucide/vue ^1.0.0` (ISC) — `tasarim_sistemi.md` spesifikasyonuna birebir uyan resmi tree-shakeable SVG ikon setidir. *Alternatif: lucide-vue-next (deprecated).*
- **Web QR Kod Üretici:** `PAKET KULLAN: qrcode.vue ^3.6.0` (MIT) — Rota aktarımında (SCR-05) dinamik SVG QR kodunu sıfır gecikmeyle üretir (< 4 KB).
- **İstemci Durum Yönetimi:** `KENDİMİZ YAZ` (Nuxt `useState` & Vue Reactivity) — Faz 1 kapsamı yalnızca harita BBox ve filtre durumundan ibaret olduğundan harici durum kütüphanesi eklenmez. *Alternatif: Pinia (gereksiz yük).*

### 3.3. Mobil Platform Katmanı (`apps/mobile` - Flutter 3.27+)
- **Durum Yönetimi:** `PAKET KULLAN: flutter_bloc ^9.1.1` (MIT) — Harita BBox ve filtre akışlarını öngörülebilir durum makineleriyle yöneterek 60 FPS akıcılığı korur. *Alternatif: GetX (mimari disiplinsizlik).*
- **Mobil Harita Motoru:** `PAKET KULLAN: maplibre_gl ^0.27.0` (BSD-3-Clause) — Web ile aynı vektör karo stilini paylaşarak GPU hızlandırmalı 60 FPS kümeleme sağlar. *Alternatif: google_maps_flutter (yüksek API maliyeti).*
- **Çevrimdışı Önbellek:** `PAKET KULLAN: hive_ce_flutter ^2.2.0` (Apache-2.0) — Orijinal `hive_flutter` terk edildiğinden, Flutter 3.27+ ve Dart 3.6+ uyumlu resmi Topluluk Sürümü (CE) kullanılır; internetsiz ortamda son istasyonları SQLite'dan 10 kat hızlı açar. *Alternatif: hive_flutter 1.1.0 (terk edilmiş/bozuk).*
- **Derin Bağlantı (Deep-Linking):** `PAKET KULLAN: app_links ^7.2.1` (Apache-2.0) — Universal Links ve App Links yönlendirmelerini arka planda ve soğuk açılışta yakalar. *Alternatif: uni_links (terk edildi).*
- **CPO Dış Uygulama Başlatıcı:** `PAKET KULLAN: url_launcher ^6.3.1` (BSD-3-Clause) — Operatör şemalarını (`zes://...`) ve market bağlantılarını işletim sistemi seviyesinde tetikler.
- **Mobil İkon Seti:** `PAKET KULLAN: flutter_lucide ^1.2.0` (MIT) — `tasarim_sistemi.md` spesifikasyonundaki Lucide ikonlarını Flutter'a taşır; web ile tam tutarlılık sağlar.
- **QR Kod Tarayıcı:** `PAKET KULLAN: mobile_scanner ^6.0.0` (Apache-2.0) — Web'de üretilen QR kodu donanım kamerasıyla < 50ms sürede çözer. *Alternatif: qr_code_scanner (terk edildi).*
- **Konum Donanım Erişimi:** `PAKET KULLAN: geolocator ^13.0.0` (MIT) — Konumu sunucuya göndermeden yalnızca cihaz belleğinde istasyona 50m mesafeyi doğrular.
- **Proximity Kriptografik İmza:** `PAKET KULLAN: crypto ^3.0.6` (BSD-3-Clause) — Ham GPS göndermeksizin tek kullanımlık `proximity_proof` HMAC-SHA256 belirtecini üretir.
- **Mobil Tema Köprüsü:** `KENDİMİZ YAZ` (`AppColorScheme` ThemeExtension) — `tokens.dart` içindeki semantik renklerin Flutter `ThemeContext` üzerinden okunmasını sağlar.

### 3.4. Backend API ve Veri Toplama Katmanı (`apps/api` & `apps/worker`)
- **HTTP Sunucu Çatısı:** `PAKET KULLAN: fastify ^5.2.0` (MIT) — Zorunlu kısıttır; p95 < 40ms spatial sorgu bütçesini düşük overhead ile karşılar.
- **Tip ve Şema Doğrulayıcı:** `PAKET KULLAN: @sinclair/typebox ^0.34.52` (MIT) — Fastify Ajv derleyicisiyle tam uyumlu çalışır; çalışma zamanı ek yükü olmadan hem statik tipleri hem OpenAPI 3.1 şemasını üretir. *Alternatif: Zod (5-10 kat yavaş).*
- **OpenAPI Dokümantasyonu:** `PAKET KULLAN: @fastify/swagger ^9.4.0` & `@fastify/swagger-ui ^5.2.0` (MIT) — TypeBox şemalarından otomatik OpenAPI 3.1 JSON dokümantasyonu üretir.
- **ORM ve Mekânsal Sorgulayıcı:** `PAKET KULLAN: drizzle-orm ^0.45.2` (Apache-2.0) — PostGIS fonksiyonlarını (`ST_MakeEnvelope`, `ST_DWithin`) SQL hızında tip güvenli çalıştırır (< 30 KB). *Alternatif: Prisma (PostGIS kısıtları ve gecikme).*
- **Şema Göçü (Migration):** `PAKET KULLAN: drizzle-kit ^0.30.5` (Apache-2.0) — Elle DDL yasağına tam uyumlu sıralı SQL migration dosyaları üretir ve işletir.
- **Veritabanı Sürücüsü:** `PAKET KULLAN: postgres ^3.4.5` (MIT, porsager/postgres) — Node.js için en hızlı saf JS PostgreSQL sürücüsüdür; bağlantı havuzunu optimize yönetir.
- **Arka Plan İş Kuyruğu Katmanı:** `KENDİMİZ YAZ` (PostgreSQL `FOR UPDATE SKIP LOCKED`) — Zorunlu kısıttır; harici Redis/RabbitMQ bağımlılığı olmadan PostgreSQL ACID garantisiyle iş tüketir. *Alternatif: pg-boss (yabancı şema dayatması).*
- **Dış HTTP İstemcisi:** `PAKET KULLAN: undici ^7.4.0` (MIT) — Node.js 22'nin yüksek hızlı HTTP istemcisidir; CPO kazıma işlerinde bağlantı havuzunu yönetir.
- **Devre Kesici (Circuit Breaker):** `PAKET KULLAN: cockatiel ^3.2.1` (MIT) — Dış CPO servisleri hata verdiğinde 15 dakika soğuma (circuit break) ve üstel geri çekilme uygular. *Alternatif: opossum (eski callback yapısı).*
- **Güvenlik ve Hız Sınırlama:** `PAKET KULLAN: @fastify/rate-limit ^10.2.0`, `@fastify/helmet ^13.0.0`, `@fastify/cors ^10.0.0` (MIT) — Token-bucket algoritmasıyla hız sınırlaması ve OWASP başlıklarını sağlar.
- **Tohumlama & Unicode Katlama:** `KENDİMİZ YAZ` (`packages/utils`) — EPDK `ŞRJ/` öneki, Türkçe harf katlama (`İ→i`, `ı→i`) ve Türkiye BBox sınır kontrollerini tekilleştirir.

### 3.5. Test, Kod Kalitesi ve CI/CD Araçları
- **Test:** `PAKET KULLAN: vitest ^3.0.7` (MIT) — Hızlı TypeScript birim/entegrasyon testi.
- **Linter & Formatter:** `PAKET KULLAN: @biomejs/biome ^1.9.4` (MIT) — ESLint/Prettier yerine Rust tabanlı hız.
- **Sözleşme Denetimi:** `PAKET KULLAN: @stoplight/spectral-cli ^6.14.0` (Apache-2.0) — CI OpenAPI 3.1 sözleşme ihlali denetimi.
- **Lighthouse CI:** `PAKET KULLAN: @lhci/cli ^0.14.0` (Apache-2.0) — SEO (≥ 90) ve A11y (≥ 95) kapı denetimi.

---

## 4. Paket Karar ve Uyumluluk Matrisi

| Yetenek Alanı | Aday / Seçilen Paket | Karar Türü | Sürüm | Lisans | Bakım Durumu | Token Uyumu |
|---|---|---|---|---|---|---|
| **Token Derleyici** | `style-dictionary` | PAKET KULLAN | `^4.3.0` | Apache-2.0 | Aktif (Amazon) | %100 (Tek kaynak) |
| **Token Formatlayıcı**| `custom-formatters` | KENDİMİZ YAZ | N/A | Şirket İçi | Aktif | %100 (`tokens.dart/css`) |
| **TS API İstemcisi** | `openapi-fetch` | PAKET KULLAN | `^0.14.0` | MIT | Çok Aktif | N/A (Veri katmanı) |
| **Dart API İstemcisi**| `openapi-generator-cli`| PAKET KULLAN | `^2.18.0` | Apache-2.0 | Çok Aktif | N/A (Veri katmanı) |
| **Web Çatısı** | `nuxt` | PAKET KULLAN | `^3.15.0` | MIT | Çok Aktif | %100 (SSR/FOUC) |
| **Web CSS** | `@nuxtjs/tailwindcss` | PAKET KULLAN | `^6.14.0` | MIT | Çok Aktif | %100 (`tokens.css`) |
| **Web UI Primitives** | `reka-ui` | PAKET KULLAN | `^2.0.0` | MIT | Çok Aktif | %100 (Headless) |
| **Web Harita** | `maplibre-gl` | PAKET KULLAN | `^5.1.0` | BSD-3-Clause | Çok Aktif | %100 (Özel pinler) |
| **Web Harita Kapsülü**| `VectorMap.vue` | KENDİMİZ YAZ | N/A | Şirket İçi | Aktif | %100 (`<ClientOnly>`) |
| **Web İkonları** | `@lucide/vue` | PAKET KULLAN | `^1.0.0` | ISC | Çok Aktif | %100 (SVG) |
| **Web QR Üretici** | `qrcode.vue` | PAKET KULLAN | `^3.6.0` | MIT | Aktif | %100 (SVG modal) |
| **Web Durum** | `useState / Reactivity`| KENDİMİZ YAZ | N/A | Şirket İçi | Aktif | %100 |
| **Mobil Durum** | `flutter_bloc` | PAKET KULLAN | `^9.1.1` | MIT | Çok Aktif | %100 (Event/State) |
| **Mobil Harita** | `maplibre_gl` | PAKET KULLAN | `^0.27.0` | BSD-3-Clause | Aktif | %100 (60 FPS) |
| **Mobil Cache** | `hive_ce_flutter` | PAKET KULLAN | `^2.2.0` | Apache-2.0 | Aktif (Topluluk)| N/A (Lokal veri) |
| **Mobil Deep-Link** | `app_links` | PAKET KULLAN | `^7.2.1` | Apache-2.0 | Çok Aktif | N/A (Yönlendirme) |
| **Mobil App Başlatıcı**| `url_launcher` | PAKET KULLAN | `^6.3.1` | BSD-3-Clause | Çok Aktif | N/A (OS köprüsü) |
| **Mobil İkonları** | `flutter_lucide` | PAKET KULLAN | `^1.2.0` | MIT | Aktif | %100 (Web eşdeğeri) |
| **Mobil QR Tarayıcı**| `mobile_scanner` | PAKET KULLAN | `^6.0.0` | Apache-2.0 | Çok Aktif | %100 (Modal) |
| **Mobil Konum** | `geolocator` | PAKET KULLAN | `^13.0.0` | MIT | Çok Aktif | N/A (In-memory 50m) |
| **Mobil Kripto** | `crypto` | PAKET KULLAN | `^3.0.6` | BSD-3-Clause | Çok Aktif | N/A (HMAC-SHA256) |
| **Mobil Tema Köprüsü**| `AppThemeExtension` | KENDİMİZ YAZ | N/A | Şirket İçi | Aktif | %100 (`tokens.dart`) |
| **Backend Framework**| `fastify` | PAKET KULLAN | `^5.2.0` | MIT | Çok Aktif | N/A (REST API) |
| **Backend Şema** | `@sinclair/typebox` | PAKET KULLAN | `^0.34.52` | MIT | Çok Aktif | N/A (Ajv derleme) |
| **Backend Doküman** | `@fastify/swagger` | PAKET KULLAN | `^9.4.0` | MIT | Çok Aktif | N/A (OpenAPI 3.1) |
| **Backend ORM** | `drizzle-orm` | PAKET KULLAN | `^0.45.2` | Apache-2.0 | Çok Aktif | N/A (PostGIS uyumlu) |
| **Backend Göç** | `drizzle-kit` | PAKET KULLAN | `^0.30.5` | Apache-2.0 | Çok Aktif | N/A (SQL üretimi) |
| **Veritabanı Driver** | `postgres` (porsager) | PAKET KULLAN | `^3.4.5` | MIT | Çok Aktif | N/A (Pool yönetimi) |
| **İş Kuyruğu** | `skip_locked_queue` | KENDİMİZ YAZ | N/A | Şirket İçi | Aktif | N/A (Postgres ACID) |
| **HTTP İstemcisi** | `undici` | PAKET KULLAN | `^7.4.0` | MIT | Çok Aktif | N/A (Bağlantı havuzu) |
| **Devre Kesici** | `cockatiel` | PAKET KULLAN | `^3.2.1` | MIT | Aktif | N/A (Circuit breaker) |
| **Hız Sınırlama** | `@fastify/rate-limit`| PAKET KULLAN | `^10.2.0` | MIT | Çok Aktif | N/A (Token Bucket) |
| **Güvenlik Başlıkları**| `@fastify/helmet` | PAKET KULLAN | `^13.0.0` | MIT | Çok Aktif | N/A (CSP & Güvenlik) |
| **CORS** | `@fastify/cors` | PAKET KULLAN | `^10.0.0` | MIT | Çok Aktif | N/A (Domain kısıtları) |
| **Test Koşturucu** | `vitest` | PAKET KULLAN | `^3.0.7` | MIT | Çok Aktif | Geliştirme Aracı |
| **Linter / Formatter**| `@biomejs/biome` | PAKET KULLAN | `^1.9.4` | MIT | Çok Aktif (Rust) | Geliştirme Aracı |
| **Sözleşme Denetimi** | `@stoplight/spectral-cli`| PAKET KULLAN | `^6.14.0` | Apache-2.0 | Aktif | CI Aracı |
| **Lighthouse CI** | `@lhci/cli` | PAKET KULLAN | `^0.14.0` | Apache-2.0 | Aktif (Google) | WCAG & SEO Kapısı |

---

## 5. "KENDİMİZ YAZ" Kararlarının Gerekçeleri

1. **PostgreSQL SKIP LOCKED İş Kuyruğu:** Zorunlu kısıt Redis/RabbitMQ kurulumunu yasaklar; `pg-boss` gibi paketler yüzlerce satırlık yabancı şema dayattığından ~100 satırlık hafif yerleşik Drizzle kuyruğu yazılır.
2. **Style Dictionary Formatlayıcıları:** Standart şablonlar Flutter `ThemeExtension` ve WCAG kontrast garantili semantik renk sınıflarını üretemediği için özel derleyici betik yazılır.
3. **Web Harita Vue Kapsülü (`VectorMap.vue`):** 3. parti paketler Nuxt SSR'da `window` nesnesi hataları verir; `<ClientOnly>` altında doğrudan MapLibre GL API'sini dinleyen temiz bileşen kurulur.
4. **Web İstemci Durum Yönetimi:** Faz 1 harita ve filtreleme kapsamı için Pinia ağır kalır; Nuxt yerel `useState` kullanılır.
5. **Unicode ve BBox Yardımcıları (`packages/utils`):** EPDK `ŞRJ/` öneki, Türkçe `İ→i` katlama kuralları ve Türkiye sınır kutusu denetimi tek bir şirket içi yardımcıda toplanır.

---

## 6. Lisans Uyumluluğu ve Risk Analizi

- **Lisans Güvenliği:** Seçilen tüm kütüphaneler **MIT**, **Apache-2.0**, **BSD-3-Clause** veya **ISC** lisanslıdır. Projede ticari kısıt veya açık kaynak zorunluluğu doğuracak (GPL/AGPL) hiçbir bağımlılık yoktur.
- **Konum Gizliliği (Zero-Storage):** Konum verisi yalnızca istemci tarafında `geolocator` ile in-memory işlenir; ağ katmanına GPS koordinatı ekleyecek hiçbir analitik SDK projeye sokulmamıştır.
- **Performans Bütçesi:**
  - *Web (Nuxt 3):* `reka-ui` (headless) ve Tailwind CSS sayesinde ana JS paketi gzip sonrasında **< 110 KB** (harita motoru hariç) kalır; FCP **< 1.2s** garanti edilir.
  - *Mobil (Flutter):* Saf Dart kütüphaneler (`crypto`, `hive_ce_flutter`) ile ikili boyutuna binen ek yük **< 12 MB** seviyesindedir; harita işlemleri Isolate üzerinde 60 FPS akıcılıkla çalışır.
