
## Yerel Çalıştırma ve Dağıtım Adımları

Bu doküman, `elektriklioto.com` platformunun yerel geliştirme (dev), test/hazırlık (staging), üretim (production) ve Sprint 6 ile eklenen **Flutter Mobil Uygulaması (Android & iOS) CI/CD ve Build Dağıtım** altyapısının orkestrasyon adımlarını ve ortam gereksinimlerini belirler.

### 1. Ön Koşullar ve Ortam Gereksinimleri

Platformun yerel ortamda ve sunucularda çalışabilmesi için aşağıdaki araçlar gereklidir:
- **Node.js:** `v22.21.0` veya üzeri (`node -v`)
- **Docker Engine:** `29.8.0` veya üzeri (`docker -v`) ve Docker Compose (`docker compose version`)
- **PostgreSQL + PostGIS:** `postgis/postgis:16-3.4` konteyneri
- **Java Development Kit (JDK):** `openjdk 17.0.17` (Android Gradle derlemeleri için)
- **Xcode & Apple Swift:** `Xcode 26.4.1` ve `Swift 6.3.1` (iOS derlemeleri için)
- **Kullanılan Portlar:** `5432` (PostgreSQL), `3000` (Fastify API), `3001` (Nuxt Web SSR), `80/443` (Nginx)

### 2. Ortam Raporundaki Eksik ve Bozuk Araçlar İçin Kurulum ve Onarım Adımları

`workspace/docs/ortam_raporu.md` içinde eksik veya bozuk olarak raporlanan araçlar için kurulum ve onarım yönergeleri:

#### 2.1. `pnpm` Kurulumu (Ortamda YOK):
Monorepo paket ve bağımlılık yönetimi için pnpm zorunludur:
```bash
npm install -g pnpm@10.20.0
pnpm --version
```

#### 2.2. `flutter` ve `dart` SDK Onarımı (Ortamda BOZUK - "Exec format error"):
Ortamdaki Darwin arm64 (Apple Silicon) mimari uyumsuzluğunu gidermek için:
```bash
# 1. Mevcut bozuk binary bağlantılarını kaldırın veya ezdirin
# 2. Resmi Darwin arm64 Flutter SDK'sını indirin ve kurun:
curl -O https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.27.1-stable.zip
unzip flutter_macos_arm64_3.27.1-stable.zip -d "$HOME/development"
export PATH="$HOME/development/flutter/bin:$PATH"
flutter doctor -v
```

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda flutter ve dart komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için yukarıdaki onarım gereklidir.
> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda pnpm YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.
> **Varsayım:** Mobil geliştirme ortamı yerel olarak onarılana ve pnpm kurulana kadar, backend ve web modülleri ortamda ölçülen node v22.21.0 ve npm 10.9.4 ile başlatılabilir; mobil Android derlemeleri ise izole Docker derleyicisi (`docker/Dockerfile.mobile-builder`) veya onarılmış yerel Flutter SDK ile yürütülebilir.

#### 2.3. Docker & PostGIS İmajının Çekilmesi:
```bash
docker pull postgis/postgis:16-3.4
```

#### 2.4. Dış Servis Kimlik Bilgileri (Tedarik Zorunlu):
- **Harita Vektör Karo Sağlayıcı Anahtarı:** Mapbox API anahtarı `env/.env` ve `env/.env.mobile` içine `MAPBOX_ACCESS_TOKEN` / `VITE_MAP_KEY` olarak tanımlanmalıdır.
- **Push Bildirimleri:** Firebase Cloud Messaging (FCM) ve Apple Developer (APNs) anahtarları temin edilmelidir.

---

### 3. Tek Tıkla Başlatıcı (On-Click Dev Launcher)

Sistemin tüm bileşenlerini (PostgreSQL+PostGIS veritabanı, Fastify API, bağımsız Worker süreci ve Web SSR) tek bir komutla ayağa kaldırmak için:

```bash
# Proje kökünden veya workspace/infra dizininden çalıştırın:
./canli.sh
```

Bu betik sırasıyla:
1. Eksik bağımlılıkları (`node_modules`) otomatik kurar.
2. Çakışan portları (`5432`, `3000`, `3001`) temizler.
3. PostGIS konteynerini başlatıp veritabanının hazır olmasını bekler (`pg_isready`).
4. Fastify API sunucusunu (`:3000`) ve bağımsız Worker sürecini paralel başlatır.
5. Web istemcisini (`:3001`) ayağa kaldırır.
6. Mobil istemci ortam durumunu denetler ve geliştirme yönergelerini sunar.
7. `Ctrl+C` yapıldığında tüm alt süreçleri ve konteynerleri temiz bir şekilde sonlandırır.

---

### 4. Sprint 6: Mobil CI/CD ve Build Dağıtımı

Sprint 6 kapsamında `elektriklioto.com` Flutter mobil istemcisinin Android ve iOS derleme hatları, CI/CD iş akışları ve Fastlane otomasyonu devreye alınmıştır.

#### 4.1. Android Build Alma (APK ve App Bundle / AAB):
Android derlemeleri ortam değişkenlerini (`--dart-define`) otomatik olarak `env/.env.mobile` şablonundan besler:
```bash
# Debug / Geliştirme APK:
./scripts/build-mobile-android.sh dev apk

# Staging APK:
./scripts/build-mobile-android.sh staging apk

# Üretim (Production) Google Play Store App Bundle (.aab):
./scripts/build-mobile-android.sh prod aab
```
Üretilen çıktılar `workspace/src/mobile/build/app/outputs/` dizininde oluşturulur ve SHA256 özetleri raporlanır.

#### 4.2. iOS Build Alma (Xcode IPA & Archive):
macOS üzerinde Xcode ve CocoaPods gerektiren iOS derlemeleri için:
```bash
# Geliştirme / Test Derlemesi (No-codesign / Simülatör):
./scripts/build-mobile-ios.sh dev

# Staging Ad-Hoc / TestFlight Derlemesi:
./scripts/build-mobile-ios.sh staging

# Üretim App Store IPA Paketi:
./scripts/build-mobile-ios.sh prod
```
Üretilen çıktılar `workspace/src/mobile/build/ios/ipa/` dizinine yerleştirilir.

#### 4.3. Docker Tabanlı İzole Mobil Derleme (Mobile Builder Container):
Ana makinede Flutter mimari çatışması veya SDK eksikliği olduğu durumlarda Android derlemeleri temiz Docker konteynerinde alınabilir:
```bash
# 1. Mobil builder imajını derleyin (Java 17, Android SDK 34, Flutter 3.27.1):
docker build -f docker/Dockerfile.mobile-builder -t elektriklioto-mobile-builder .

# 2. Konteyner içinde APK derleyin:
docker run --rm -v $(pwd)/../src/mobile:/app elektriklioto-mobile-builder flutter build apk --flavor prod
```

#### 4.4. Fastlane ile Otomatik Dağıtım:
Fastlane yapılandırması `fastlane/` altında konumlanmıştır:
```bash
cd fastlane

# Android internal test dağıtımı (Firebase App Distribution):
bundle exec fastlane android build_internal

# Android Google Play Store Internal Track yayını:
bundle exec fastlane android deploy_playstore

# iOS TestFlight yayını:
bundle exec fastlane ios distribute_testflight
```

#### 4.5. Mobil CI/CD İş Akışı (GitHub Actions):
`ci/mobile-ci.yml` dosyasında tanımlanan iş akışı:
- `lint-and-test`: `flutter analyze` ve `flutter test` adımlarını çalıştırır; kod kapsamı (coverage) denetler.
- `build-android`: Staging ve Prod için APK/AAB üretir ve GitHub Release / Artifacts olarak depolar.
- `build-ios`: macOS runner üzerinde Xcode arşiv ve IPA derlemesini tamamlar.

#### 4.6. Sprint 6 Sağlık Denetimi:
Mobil CI/CD hattı, betikler, yapılandırma ve SDK durumunu doğrulamak için:
```bash
./scripts/healthcheck-s6.sh
```

---

### 5. Docker Compose ile Yerel Geliştirme

Tüm backend ve web bileşenlerini Docker üzerinde ayağa kaldırmak için:

```bash
# 1. Ortam değişkenlerini hazırlayın
cp env/.env.example env/.env

# 2. Konteynerleri derleyin ve arka planda başlatın
docker compose -f docker-compose.yml up -d --build

# 3. Servis durumlarını doğrulayın
docker compose -f docker-compose.yml ps

# 4. Logları canlı izleyin
docker compose -f docker-compose.yml logs -f worker api
```

---

### 6. Staging (Hazırlık) Ortamı Dağıtımı

```bash
# 1. Staging ortam değişkenlerini kontrol edin
cp env/.env.staging.example env/.env.staging

# 2. Staging dağıtım betiğini çalıştırın
./scripts/deploy-staging.sh

# 3. Staging sağlık denetimlerini çalıştırın
./scripts/healthcheck-s3.sh
```

---

### 7. Üretim (Production) Dağıtımı

```bash
# 1. Üretim ortam dosyasını hazırlayın ve güvenli anahtarları tanımlayın
cp env/.env.production.example env/.env.production

# 2. Üretim dağıtım betiğini çalıştırın
./scripts/deploy-production.sh

# 3. S5 Worker ve Veri Tazeliği Doğrulama Denetimini çalıştırın
./scripts/healthcheck-s5.sh
```

---

### 8. Servis ve Port Haritası

| Servis | Konteyner Adı | Yerel / Dahili Port | Dış Erişim URL | Sağlık Uç Noktası |
|---|---|---|---|---|
| **PostgreSQL + PostGIS** | `elektriklioto-db-prod` | `5432` | `localhost:5432` | `pg_isready -U postgres` |
| **Fastify API (Monolit)** | `elektriklioto-api-prod` | `3000` | `https://api.elektriklioto.com` | `/health`, `/api/v1/health/queue` |
| **Bağımsız Worker** | `elektriklioto-worker-prod` | *(Headless)* | *(Dış erişim yok)* | `sys_job_queue` heartbeat |
| **Nuxt 3 Web SSR** | `elektriklioto-web-prod` | `3001` | `https://elektriklioto.com` | `GET /` |
| **Flutter Mobil İstemci** | *(Android / iOS İstemci)* | *(Cihaz içi)* | `com.elektriklioto.app` | Yerel Hive & BLoC state |
| **Nginx Ters Vekil** | `elektriklioto-nginx-prod` | `80`, `443` | `http(s)://elektriklioto.com` | `/nginx_status` |

---

### 9. Yasal ve Mimari Kısıtlar Bildirimi

- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK lisansına tabi elektrik satışı ve faturalama yapamaz (zorunlu).
- **Konum Gizliliği (KVKK):** Kullanıcı GPS koordinatları sunucuda kesinlikle saklanamaz; yalnızca istemci belleğinde (in-memory) işlenir (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve anlık doluluk Faz 1'de `NULL` kabul edilir; mock uydurma veri üretilemez (zorunlu).
- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
