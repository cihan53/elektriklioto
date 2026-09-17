# Teknoloji Stack Kararı: elektriklioto.com

> **Belge Sürümü:** 1.0.0-faz1  
> **Durum:** Onaylandı (Nihai Karar Dokümanı)  
> **Kapsam:** Faz 1 Çekirdek Teknoloji Stack'i, Kütüphane Seçimleri, Modül Bağımlılıkları ve Araç Zinciri  
> **Doğruluk Kaynağı:** `proje_kapsami.md` ve `workspace/docs/ortam_raporu.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Temel Varsayımlar

Aşağıdaki kısıtlar projenin tartışılamaz sınırlarıdır; tüm teknoloji seçimleri bu zemine oturtulmuştur:

- **Alan Adı ve Marka:** `elektriklioto.com` (API: `api.elektriklioto.com`, Web: `elektriklioto.com`, Mobil deep-link: `elektriklioto.com/app/...`) (zorunlu).
- **Backend:** Node.js / TypeScript üzerinde Fastify framework (zorunlu). Alternatif framework'ler (Express, NestJS) değerlendirme dışıdır.
- **Web:** Nuxt.js / Vue.js ile SSR/SSG uyumlu mimari (zorunlu).
- **Mobil:** Flutter ile iOS ve Android için tek kod tabanı (zorunlu).
- **Veritabanı:** Docker üzerinde çalışan `postgis/postgis:16-3.4` resmi imajı ve `docker-compose.yml` (zorunlu). Elle DDL yasaktır; şema yalnızca migration dosyalarıyla yönetilir (zorunlu).
- **Hukuki / Yasal Statü:** Platform lisanslı şarj operatörü değildir; elektrik satışı, faturalandırma ve uygulama içi ödeme kapsam dışıdır (zorunlu).
- **Konum Gizliliği (KVKK/GDPR):** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca anlık sorgular için in-memory işlenir (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` tek kaynaktır; arayüz geliştiricisi görsel karar veremez; Web (CSS) ve Mobil (Dart) token'ları tek kaynaktan derlenir (zorunlu).
- **Veri Tabanı Tohumlama:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır; koordinat mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri:** Soket tipi, güç, tarife ve anlık doluluk verisi Faz 1 başlangıcında `NULL` kabul edilir; sistem bu alanlar boşken çalışır (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** `pnpm` ve `flutter` ortamda hazır hale getirilene kadar; backend ve web projeleri ölçülen `node v22.21.0` ve `npm 10.9.4` ile başlatılabilir; ancak monorepo paket paylaşımı (`packages/design-tokens` ve `packages/api-client`) için pnpm kurulumu ilk aşamada tamamlanmalıdır.

---

## 2. Ortam Envanteri ve Bağımlılık Matrisi

Sistem seçimleri, geliştirme makinesinde **ölçülerek doğrulanmış** araçlarla sınırlandırılmıştır.

| Bileşen / Araç | Ortam Durumu | Seçilen Rol / İşlev | Not / Aksiyon |
|---|---|---|---|
| `node` | **VAR (v22.21.0)** | Backend API, Worker, Nuxt SSR ve Derleme Araçları | Çekirdek JavaScript/TypeScript çalışma zamanı. |
| `npm` | **VAR (10.9.4)** | Geçici Bağımlılık Yöneticisi | İlk kurulum ve pnpm tetikleme aracı. |
| `pnpm` | **YOK** | Monorepo Paket Yöneticisi | **KURULUM GEREKİYOR: pnpm** (`npm i -g pnpm@latest`). |
| `docker` | **VAR (v29.8.0)** | Veritabanı ve Yerel Servis Altyapısı | `postgis/postgis:16-3.4` konteynerini çalıştırır. |
| `flutter` / `dart` | **BOZUK** | Çapraz Platform Mobil İstemci | **KURULUM GEREKİYOR: arm64 uyumlu Flutter 3.27+ SDK**. |
| `java` | **VAR (OpenJDK 17.0.17)**| Android Derleme Hattı | Gradle ve Android SDK derleme zinciri için yeterli. |
| `swift` / `xcodebuild` | **VAR (Swift 6.3.1 / Xcode 26.4.1)** | iOS Derleme Hattı | iOS simülatör ve üretim derlemeleri için hazır. |
| `make` | **VAR (GNU Make 3.81)** | Geliştirici Görev Yürütücüsü | `Makefile` ile monorepo CLI görevlerini standardize eder. |
| `git` | **VAR (v2.45.2)** | Sürüm Kontrolü | Git Hooks ve semantik sürümlendirme altyapısı. |
| Harita Sağlayıcı | Envanter Dışı | Web ve Mobil Harita Görselleştirme | **KURULUM GEREKİYOR: Mapbox / MapLibre API Anahtarı**. |
| Push Bildirim | Envanter Dışı | Favori ve Durum Değişikliği Bildirimi | **KURULUM GEREKİYOR: Firebase / APNs Kimlik Bilgileri**. |

---

## 3. Monorepo ve Proje Yapısı

### 3.1. Monorepo Yöneticisi: pnpm Workspaces
- **Karar:** Tüm servisler (`apps/api`, `apps/worker`, `apps/web`, `apps/mobile`, `packages/design-tokens`, `packages/api-client`) tek bir Git deposunda `pnpm workspaces` ile yönetilir.
- **Gerekçe:** Web ve mobil tasarım token'larının, OpenAPI tip tanımlarının ve paylaşımlı yardımcı fonksiyonların sembolik bağlantılarla sıfır gecikmeyle paylaşılması.
- **Somut Sonuç:** Tek bir `pnpm install` ile tüm Node bağımlılıkları disk alanı kopyalanmadan linklenir; bağımsız paket sürümlendirme karmaşası biter.
- **Alternatifler:** *Turborepo + npm:* npm'in çalışma hızı ve disk tüketimi nedeniyle elendi; *Lerna:* Güncelliğini yitirdiği için elendi.

---

## 4. Backend ve Veri Toplama Katmanı (`apps/api` & `apps/worker`)

### 4.1. Çalışma Zamanı ve Çatı: Fastify (Node.js 22 + TypeScript 5.7)
- **Karar:** REST API sunucusu olarak TypeScript ile konfigüre edilmiş Fastify v5 kullanılır.
- **Gerekçe:** Düşük ek yük (overhead), yerel JSON şema derlemesi (Ajv) ve p95 < 40ms hedefi için yüksek throughput sağlaması.
- **Somut Sonuç:** API süreci saniyede on binlerce spatial sorguyu mikro-saniye seviyesinde yönlendirir.
- **Alternatifler:** *Express:* Performans düşüklüğü ve zayıf tip güvenliği nedeniyle zorunlu kısıt gereği elendi; *NestJS:* Aşırı soyutlama ve yüksek bellek tüketimi nedeniyle elendi.

### 4.2. API Şeması ve Tip Doğrulama: TypeBox + Fastify Swagger
- **Karar:** DTO modelleri `@sinclair/typebox` ile yazılır; `@fastify/swagger` ile otomatik OpenAPI 3.1 spesifikasyonu üretilir.
- **Gerekçe:** TypeBox, JSON Schema standartlarına %100 uyar, derleme anında statik TypeScript tipleri üretir ve çalışma anında Fastify Ajv motoruyla sıfır ek yükle doğrulanır.
- **Somut Sonuç:** OpenAPI şeması için ikinci bir dosya yazılmaz; kod tek doğruluk kaynağıdır.
- **Alternatifler:** *Zod:* Çalışma anı performans maliyeti TypeBox'a göre 5-10 kat daha yavaş olduğu için elendi; *tRPC:* Web harici Flutter istemcisiyle yerel uyumsuzluğu nedeniyle elendi.

### 4.3. Veri Erişim Katmanı ve Şema Göçü: Drizzle ORM + Drizzle Kit
- **Karar:** Veritabanı sorguları ve şema yönetimi için `drizzle-orm` ve `drizzle-kit` kullanılır; sürücü olarak `postgres` (porsager/postgres) tercih edilir.
- **Gerekçe:** Drizzle, SQL'e en yakın hafif (zero-cost) soyutlamayı sunar; PostGIS uzantılarını (`ST_MakeEnvelope`, `ST_DWithin`, `ST_Distance`) ham SQL parçacıklarıyla tip güvenli çalıştırır ve salt SQL migration dosyaları üretir.
- **Somut Sonuç:** Üretimde elle DDL yasak kısıtına tam uyum sağlanır; migration'lar CI hattında deterministik olarak işletilir.
- **Alternatifler:** *Prisma:* PostGIS desteğinin kısıtlı olması ve Rust query engine ikilisinin getirdiği ek gecikme nedeniyle elendi; *Kysely:* Migration araçlarının Drizzle kadar gelişmiş olmaması nedeniyle ikinci planda kaldı.

### 4.4. Arka Plan İş Kuyruğu: PostgreSQL `FOR UPDATE SKIP LOCKED`
- **Karar:** CPO senkronizasyonu ve kitle-kaynak arıza bildirimi işleri için harici kuyruk (Redis/RabbitMQ) kurulmaz; PostgreSQL içinde iş kuyruğu tablosu ve `FOR UPDATE SKIP LOCKED` deseni kullanılır.
- **Gerekçe:** Dış bağımlılık sınırlandırması; operasyonel maliyeti sıfırda tutarak ACID garantisiyle kuyruk işletmek.
- **Somut Sonuç:** `apps/worker` süreci veri çekerken API sürecinin CPU ve bellek havuzunu etkilemez; kilitlenmeler veritabanı motoru tarafından engelsiz aşılır.
- **Alternatifler:** *BullMQ / Redis:* Ek sunucu/servis bağımlılığı getirmeme kısıtı nedeniyle elendi; *Kafka:* Faz 1 ölçeği için aşırı mühendislik sayıldığından elendi.

### 4.5. Dış Veri Toplama HTTP İstemcisi: Undici + Cockatiel
- **Karar:** CPO kamusal uç noktalarından veri çeken worker'lar `undici` (Node.js yerel HTTP istemcisi) ve `cockatiel` (Circuit Breaker & Retry politikası) ile donatılır.
- **Gerekçe:** 429/403 yanıtlarında kaynak IP engeline takılmamak ve kaynak çöktüğünde worker'ın sonsuz döngüde kilitlenmesini engellemek.
- **Somut Sonuç:** 24 saat yanıt vermeyen operatör uç noktası izole edilir, arayüzde "veri güncel değil" rozeti otomatik tetiklenir.
- **Alternatifler:** *Axios:* Eski mimarisi ve ağır bağımlılık yükü nedeniyle elendi.

---

## 5. Veritabanı ve Mekânsal Altyapı Katmanı

### 5.1. Veritabanı Motoru: PostgreSQL 16 + PostGIS 3.4 (Docker)
- **Karar:** `postgis/postgis:16-3.4` resmi Docker imajı, depoda sabitlenen `docker-compose.yml` ile ayağa kaldırılır.
- **Gerekçe:** 16.788 istasyonun koordinatlarını küre geometrisi üzerinde (WGS 84 / SRID 4326) tutmak ve bounding-box sorgularını p95 < 40ms hedefiyle yanıtlamak.
- **Somut Sonuç:** Coğrafi sütun `geography(Point, 4326)` olarak saklanır ve `GIST(geom)` mekânsal indeksiyle taranır.
- **Alternatifler:** *MySQL Spatial:* Mekânsal fonksiyon kısıtları ve düşük CBS performansı nedeniyle elendi; *MongoDB Geospatial:* İlişkisel şema ve ACID garantisi gereksinimleri nedeniyle elendi.

---

## 6. Web Platformu Katmanı (`apps/web`)

### 6.1. Web Çatısı: Nuxt 3 (Vue 3 + Vite + Nitro)
- **Karar:** Web platformu Nuxt 3 üzerinde hibrit SSR/SSG stratejisiyle geliştirilir.
- **Gerekçe:** Zorunlu kısıt; il/ilçe ve operatör dizin sayfalarının (örn: `/istanbul/kadikoy/sarj-istasyonlari`) arama motorları için tam HTML olarak üretilmesi (Lighthouse SEO > 90, FCP < 1.2s).
- **Somut Sonuç:** Arama motorları tam statik/SSR HTML tüketirken, harita gibi dinamik etkileşimler istemci tarafında hidrasyon ile çalışır.
- **Alternatifler:** *Next.js:* Kullanıcının kesin Nuxt.js/Vue.js zorunlu kısıtı gereği değerlendirme dışıdır.

### 6.2. Web Harita Motoru: MapLibre GL JS
- **Karar:** Web tarafındaki interaktif harita bileşeni için `maplibre-gl` kütüphanesi kullanılır; bileşen `<ClientOnly>` etiketi altına izole edilir.
- **Gerekçe:** Açık kaynaklı, hafif, vektör karo (vector tile) ve GeoJSON kümelemeyi (clustering) donanım hızlandırmalı (WebGL) yüksek FPS ile render edebilmesi.
- **Somut Sonuç:** SSR aşamasında `window is not defined` hataları tamamen engellenir; harita sadece tarayıcıda akıcı şekilde yüklenir.
- **Alternatifler:** *Leaflet:* Vektör karo ve yoğun kümeleme performansında WebGL gerisinde kaldığı için elendi; *Google Maps JS API:* Yüksek lisans maliyeti ve vendor-lockin nedeniyle elendi.

### 6.3. Stil ve Tema Mimarisi: Tailwind CSS + CSS Custom Properties (Tokens)
- **Karar:** Web arayüzü `tailwindcss` ve tasarım sisteminden türetilen CSS değişkenleri (`var(--color-...)`) ile şekillendirilir.
- **Gerekçe:** Tasarım token'larının merkezi yönetimini bozmadan hızlı ve responsive arayüzler inşa etmek.
- **Somut Sonuç:** Koyu tema tercihi (`dark` sınıfı), Nitro sunucu kancasıyla HTML'e SSR anında enjekte edilir ve istemcide sayfa parlaması (FOUC) sıfıra indirilir.
- **Alternatifler:** *Vuetify / Quasar:* Ağır CSS yükleri ve tasarım token'larını birebir yansıtmadaki zorlukları nedeniyle elendi.

---

## 7. Mobil Platform Katmanı (`apps/mobile`)

### 7.1. Mobil Çatı: Flutter 3.27+ (Dart 3.6+)
- **Karar:** iOS ve Android için tek kod tabanı olarak Flutter kullanılır (zorunlu).
- **Gerekçe:** Tek tasarım dilini 60 FPS akıcılıkla her iki ekosisteme piksel hassasiyetinde yansıtmak.
- **Somut Sonuç:** Ortamdaki "Exec format error" hatası giderildikten sonra, Android ve iOS paketleri tek kaynaktan derlenir.
- **Alternatifler:** *React Native / Kotlin Multiplatform:* Kullanıcının kesin Flutter zorunlu kısıtı gereği değerlendirme dışıdır.

### 7.2. Durum Yönetimi (State Management): flutter_bloc / cubit
- **Karar:** Mobil istemcinin iş mantığı ve ekran durumları `flutter_bloc` (Cubit) ile yönetilir.
- **Gerekçe:** Harita sınır kutusu (viewport) değişiklikleri, filtreleme ve arıza bildirim akışlarının öngörülebilir, test edilebilir ve izole durum makinelerine ayrılması.
- **Somut Sonuç:** UI ve veri katmanı tamamen ayrışır; bellek sızıntıları önlenir.
- **Alternatifler:** *Provider:* Büyük ölçekli harita reaktivitesinde karmaşıklaştığı için elendi; *GetX:* Mimari disiplini zayıflattığı için elendi.

### 7.3. Mobil Harita Motoru: flutter_map + MapLibre / Mapbox SDK
- **Karar:** `maplibre_gl` (veya `mapbox_maps_flutter`) eklentisi kullanılır.
- **Gerekçe:** Harita üzerinde binlerce istasyon pininin kümelenmesini (Supercluster) cihaz GPU'sunu kullanarak 60 FPS ile render etmek.
- **Somut Sonuç:** Büyük GeoJSON veri parse işlemleri `compute()` / Dart Isolate havuzuna devredilerek UI thread takılmaları (jank) engellenir.
- **Alternatifler:** *Google Maps Flutter:* Vektör karo esnekliğinin düşük olması ve API maliyetleri nedeniyle ikinci planda tutuldu.

### 7.4. Cihaz İçi Yerel Depolama (Offline Cache): Hive
- **Karar:** Son gezilen istasyonların ve kullanıcı anonim cihaz oturumunun saklanması için `hive_flutter` kullanılır.
- **Gerekçe:** Saf Dart ile yazılmış, SQLite'a kıyasla katbekat hızlı çalışan NoSQL anahtar-değer deposu olması.
- **Somut Sonuç:** Cihaz tünel veya otoparkta internetsiz kaldığında son bilinen istasyonlar haritada görünmeye devam eder.
- **Alternatifler:** *sqflite:* Mobil disk I/O yükü ve kurulum karmaşıklığı nedeniyle elendi.

### 7.5. Derin Bağlantı (Deep-Link Engine): app_links + url_launcher
- **Karar:** Seçilen soket için operatör uygulamasına geçiş `app_links` ve `url_launcher` eklentileriyle sağlanır.
- **Gerekçe:** Evrensel linkleri (Universal Links / App Links) ve özel URL şemalarını (örn: `zes://station?id=...`) hatasız tetiklemek.
- **Somut Sonuç:** Hedef uygulama yüklüyse doğrudan soket açılır; yüklü değilse mağaza sayfasına yönlendirilir veya soket ID panoya (clipboard) kopyalanır.
- **Alternatifler:** *Uni Links:* Güncelliğini yitirdiği ve terk edildiği için elendi.

---

## 8. Tasarım Sistemi ve Token Derleme Hattı (`packages/design-tokens`)

### 8.1. Derleme Motoru: Style Dictionary (Node.js)
- **Karar:** `tasarim_sistemi.md` spesifikasyonundaki renk, boşluk, köşe yarıçapı, tipografi ve gölge değerleri `tokens/tokens.json` içinde tutulur; `style-dictionary` ile derlenir.
- **Gerekçe:** Web ve mobilin tek tasarım dilini paylaşması zorunlu kısıtı.
- **Somut Sonuç:** Tek bir `pnpm build:tokens` komutu ile Nuxt için `tokens.css` (CSS Custom Properties) ve Flutter için `tokens.dart` (`abstract class AppTokens`) dosyaları eşzamanlı üretilir.
- **Alternatifler:** *Elle yazılan CSS ve Dart:* Senkronizasyon hatalarına ve insan kusuruna açık olduğu için kesinlikle yasaklanmıştır.

---

## 9. API Sözleşmesi ve İstemci Üretim Araçları (`packages/api-client`)

### 9.1. Sözleşme ve Üretim: OpenAPI 3.1 + openapi-typescript / openapi-generator-cli
- **Karar:** Fastify sunucusunun ürettiği `/documentation/json` (OpenAPI 3.1) çıktısı kullanılarak, Nuxt için TypeScript fetch istemcisi, Flutter için Dart DTO sınıfları üretilir.
- **Gerekçe:** Elle yazılmış istemci modellerinin yasak olması; API kontrat değişikliklerinin anında derleme hatası vererek yakalanması.
- **Somut Sonuç:** Backend'de yapılan bir alan adı veya tip değişikliği istemci tarafında otomatik tip hatası üretir; runtime hataları önlenir.
- **Alternatifler:** *Elle DTO yazımı:* Zorunlu kısıt gereği tamamen yasaktır.

---

## 10. Test, Kod Kalitesi ve CI/CD Araçları

### 10.1. Birim ve Entegrasyon Testleri: Vitest
- **Karar:** Backend API, Worker ve Web birim testleri için `vitest` kullanılır.
- **Gerekçe:** Node.js ve Vite ekosistemiyle tam yerel entegrasyon; TypeScript dosyalarını derlemeden anında çalıştırması ve Jest'e oranla 10 kat hızlı olması.
- **Somut Sonuç:** Spatial fonksiyonlar ve tohumlama mantığı saniyeler içinde test edilir.
- **Alternatifler:** *Jest:* TypeScript dönüşüm ağırlığı ve ESM uyumsuzlukları nedeniyle elendi.

### 10.2. Statik Analiz, Lint ve Format: Biome
- **Karar:** TypeScript/JavaScript kod tabanı için linter ve formatter olarak `biome` kullanılır.
- **Gerekçe:** Rust tabanlı olağanüstü hız; ESLint ve Prettier'ın ayrı ayrı yapılandırılma karmaşasını tek bir araçla çözmesi.
- **Somut Sonuç:** Kod tabanında sıfır format tartışması; pre-commit ve CI kontrolleri < 1 saniyede biter.
- **Alternatifler:** *ESLint + Prettier:* Yavaşlık ve eklenti çakışmaları nedeniyle elendi.

### 10.3. Sözleşme ve Tasarım Denetimi: Spectral + Lighthouse CI
- **Karar:** OpenAPI şema doğrulaması için `@stoplight/spectral-cli`, erişilebilirlik ve performans için `@lhci/cli` kullanılır.
- **Gerekçe:** CI boru hattında WCAG 2.1 AA (kontrast ≥ 4.5:1, dokunma hedefi ≥ 44x44pt) ve Lighthouse SEO > 90 şartlarının otomatik denetlenmesi.
- **Somut Sonuç:** Erişilebilirlik veya SEO puanını kıran hiçbir commit ana dala birleşemez.
- **Alternatifler:** *Manuel denetim:* İnsan hatasına açık olduğu için elendi.

---

## 11. Özet Teknoloji Karar Matrisi

```
elektriklioto.com (Monorepo - pnpm workspaces)
├── apps/
│   ├── api/          → Node.js v22 | TypeScript 5.7 | Fastify v5 | Drizzle ORM | TypeBox
│   ├── worker/       → Node.js v22 | TypeScript 5.7 | Drizzle ORM | Undici | Cockatiel
│   ├── web/          → Nuxt 3 (Nitro/Vite) | Vue 3 | Tailwind CSS | MapLibre GL JS
│   └── mobile/       → Flutter 3.27+ | Dart 3.6+ | flutter_bloc | MapLibre SDK | Hive
├── packages/
│   ├── design-tokens/→ Style Dictionary (Kaynak: tokens.json → Çıktı: tokens.css & tokens.dart)
│   └── api-client/   → OpenAPI Generator (OpenAPI 3.1 → Çıktı: TypeScript Client & Dart DTOs)
└── infrastructure/
    └── docker/       → Docker 29.8 | postgis/postgis:16-3.4 | docker-compose.yml
```

Bu kararlar doğrultusunda, ortamdaki `pnpm` eksikliği ve `flutter/dart` çalıştırma formatı hatası ilgili devops adımlarında çözülecek; kodlama bu sabitlenmiş mimari dışında hiçbir kütüphane uydurulmadan yürütülecektir.
