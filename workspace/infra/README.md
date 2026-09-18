
## Yerel Çalıştırma ve Dağıtım Adımları

Bu doküman, `elektriklioto.com` platformunun yerel geliştirme (dev), test/hazırlık (staging), üretim (production) ve Sprint 11 ile devreye alınan **[TALEP-012] Yeni Dağıtım Algılama (Version Polling) ve 20 Saniye Otomatik Yenilenme** altyapısının orkestrasyon adımlarını ve ortam gereksinimlerini belirler.

### 1. Ön Koşullar ve Ortam Gereksinimleri

Platformun yerel ortamda ve sunucularda çalışabilmesi için aşağıdaki araçlar ve portlar gereklidir:
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

Sistemin tüm bileşenlerini (PostgreSQL+PostGIS veritabanı, Fastify API, bağımsız Worker süreci ve Nuxt 3 Web SSR) tek bir komutla ayağa kaldırmak için:

```bash
# Proje kökünden veya workspace/infra dizininden çalıştırın:
./canli.sh
```

Bu betik sırasıyla:
1. Eksik bağımlılıkları (`node_modules`) otomatik kurar.
2. Çakışan portları (`5432`, `3000`, `3001`) temizler.
3. PostGIS konteynerini başlatıp veritabanının hazır olmasını bekler (`pg_isready`).
4. TALEP-012 için geliştirme `version.json` dosyasını (`dev-buildId`) hazırlar.
5. Fastify API sunucusunu (`:3000`) ve bağımsız Worker sürecini paralel başlatır.
6. Web istemcisini (`:3001`) ayağa kaldırır.
7. Mobil istemci ortam durumunu denetler ve geliştirme yönergelerini sunar.
8. `Ctrl+C` yapıldığında tüm alt süreçleri ve konteynerleri temiz bir şekilde sonlandırır.

---

### 4. Sprint 11: TALEP-012 Yeni Deploy Algılama ve 20s Otomatik Yenilenme Altyapısı

Site sahibinin ilettiği TALEP-012 gereksinimi:
> *"Eğer bir deploy çıkarsa tüm açık olan sayfaların uyarı verip yenilenmesini istesin kullanıcıdan, eğer 20sn içinde cevap vermez ise yinede yenilesin."*

#### 4.1. Mimari Mekanizma:
1. **Benzersiz Sürüm Kimliği (Build ID & Timestamp):**
   - Her `deploy-production.sh` veya `deploy-staging.sh` çalıştığında benzersiz bir `BUILD_ID` üretilir (örn: `prod-20260918120000-a1b2c3d`).
   - Bu değer `docker build --build-arg BUILD_ID=...` ile Docker imajına enjekte edilir.
   - Derleme aşamasında hem `public/version.json` hem de `.output/public/version.json` oluşturulur:
     ```json
     {
       "version": "1.0.0",
       "buildId": "prod-20260918120000-a1b2c3d",
       "deployedAt": "2026-09-18T09:00:00Z",
       "timestamp": 1789722000
     }
     ```
2. **Nginx Kesin Önbellek Engelleme (Zero-Cache Proxying):**
   - Nginx yapılandırmalarında (`nginx/production.conf` ve `nginx/staging.conf`) `/version.json` uç noktası için `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0` başlığı tanımlanmıştır.
   - Tarayıcı ve ara proxy'ler sürüm dosyasını kesinlikle önbelleğe alamaz.
3. **Frontend Periyodik Polling & 20s Geri Sayım:**
   - İstemci açık kaldığı sürece periyodik olarak `/version.json` sorgular.
   - Sayfanın açılışındaki ilk `buildId` ile sunucudaki yeni `buildId` farklılaştığında kullanıcıya:
     *"Yeni sürüm yayınlandı, sayfa güncelleniyor (20s)"* uyarısı çıkar, *"Şimdi Yenile"* butonu sunulur ve 20 saniye içinde tıklanmazsa `window.location.reload(true)` ile sayfa otomatik yenilenir.
4. **S11 Sağlık Denetimi:**
   ```bash
   ./scripts/healthcheck-s11.sh
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
docker compose -f docker-compose.yml logs -f worker api web
```

---

### 6. Staging (Hazırlık) Ortamı Dağıtımı

```bash
# 1. Staging ortam değişkenlerini kontrol edin
cp env/.env.staging.example env/.env.staging

# 2. Staging dağıtım betiğini çalıştırın (Otomatik BUILD_ID üretir ve doğrular)
./scripts/deploy-staging.sh

# 3. Sağlık denetimlerini çalıştırın
./scripts/healthcheck-s3.sh
./scripts/healthcheck-s11.sh
```

---

### 7. Üretim (Production) Dağıtımı

```bash
# 1. Üretim ortam dosyasını hazırlayın ve güvenli anahtarları tanımlayın
cp env/.env.production.example env/.env.production

# 2. Üretim dağıtım betiğini çalıştırın (TALEP-012 Build ID enjeksiyonu ve Zero-Downtime)
./scripts/deploy-production.sh

# 3. Sistem ve Sürüm Sağlık Denetimlerini çalıştırın
./scripts/healthcheck-s5.sh
./scripts/healthcheck-s11.sh
```

---

### 8. Servis ve Port Haritası

| Servis | Konteyner Adı | Yerel / Dahili Port | Dış Erişim URL | Sağlık / Doğrulama Uç Noktası |
|---|---|---|---|---|
| **PostgreSQL + PostGIS** | `elektriklioto-db-prod` | `5432` | `localhost:5432` | `pg_isready -U postgres` |
| **Fastify API (Monolit)** | `elektriklioto-api-prod` | `3000` | `https://api.elektriklioto.com` | `/health`, `/api/v1/health/queue` |
| **Bağımsız Worker** | `elektriklioto-worker-prod` | *(Headless)* | *(Dış erişim yok)* | `sys_job_queue` heartbeat |
| **Nuxt 3 Web SSR** | `elektriklioto-web-prod` | `3001` | `https://elektriklioto.com` | `GET /`, `GET /version.json` |
| **TALEP-012 Version Check**| `elektriklioto-web-prod` | `3001` | `https://elektriklioto.com/version.json` | `no-cache` JSON yanıtı |
| **Flutter Mobil İstemci** | *(Android / iOS İstemci)* | *(Cihaz içi)* | `com.elektriklioto.app` | Yerel Hive & BLoC state |
| **Nginx Ters Vekil** | `elektriklioto-nginx-prod` | `80`, `443` | `http(s)://elektriklioto.com` | `/health`, `/version.json` |

---

### 9. Yasal ve Mimari Kısıtlar Bildirimi

- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK lisansına tabi elektrik satışı ve faturalama yapamaz (zorunlu).
- **Konum Gizliliği (KVKK):** Kullanıcı GPS koordinatları sunucuda kesinlikle saklanamaz; yalnızca istemci belleğinde (in-memory) işlenir (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve anlık doluluk Faz 1'de `NULL` kabul edilir; mock uydurma veri üretilemez (zorunlu).
- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
