
## Yerel Çalıştırma ve Dağıtım Adımları

Bu doküman, `elektriklioto.com` platformunun yerel geliştirme (dev), test/hazırlık (staging), üretim (production) ve Sprint 13 ile çözülen **[TALEP-014] Cron Günlük İstasyon Senkronizasyonu (0 İstasyon Hatasının Giderilmesi)** altyapısının orkestrasyon adımlarını ve ortam gereksinimlerini belirler.

### 1. Ön Koşullar ve Ortam Gereksinimleri

Platformun yerel ortamda ve sunucularda çalışabilmesi için aşağıdaki araçlar ve portlar gereklidir:
- **Node.js:** `v22.21.0` veya üzeri (`node -v`)
- **Python:** `Python 3.6+` (cPanel CentOS 7 için Python 3.6.8 veya modern `.venv` / CloudLinux Alt-Python)
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
# 1. Resmi Darwin arm64 Flutter SDK'sını indirin ve kurun:
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
4. CPO istasyon tohum verisinin (`cpo_stations.json`) hazır olduğunu doğrular.
5. Fastify API sunucusunu (`:3000`) ve bağımsız Worker sürecini paralel başlatır.
6. Web istemcisini (`:3001`) ayağa kaldırır.
7. Mobil istemci ortam durumunu denetler ve geliştirme yönergelerini sunar.
8. `Ctrl+C` yapıldığında tüm alt süreçleri ve konteynerleri temiz bir şekilde sonlandırır.

---

### 4. Sprint 11: TALEP-012 Yeni Deploy Algılama ve 20s Otomatik Yenilenme Altyapısı

- Benzersiz `BUILD_ID` üretimi (`deploy-production.sh` / `deploy-staging.sh`).
- Nginx üzerinde `/version.json` için `no-cache, no-store` direktifleri.
- Frontend tarafında açık sayfalarda 20 saniyelik geri sayımla otomatik yenileme.

---

### 5. Sprint 13: TALEP-014 cPanel Cron Günlük İstasyon Senkronizasyonu Onarımı

Müşteri (site sahibi) bildiriminde `import_cpo_stations.py` betiğinin cron çalıştırmasında 0 kayıt ürettiğini (`4.0K (0 istasyon hazır)`) raporlamıştır:
```text
[2026-09-18 02:00:02] ETL Pipeline (import_cpo_stations.py) çalıştırılıyor...
[2026-09-18 02:00:02] ETL Pipeline başarıyla tamamlandı.
[2026-09-18 02:00:02] Güncel İstasyon Dosyası: 4.0K (0 istasyon hazır)
```

#### 5.1. Kök Neden Analizi:
1. **Veri Yolu Eksikliği:** cPanel ortamına dağıtılan pakette ham CPO veri dosyaları bulunmadığında ETL betiği 0 istasyon normalize ediyordu.
2. **Sıfır Kayıt Ezme Hatası:** Betik 0 kayıt aldığında mevcut geçerli `cpo_stations.json` dosyasını `[]` ile ezip boşaltıyordu.
3. **Python 3.6+ Ortam Uyumluluğu:** cPanel varsayılan `/usr/bin/python3` sürümü (Python 3.6.8) harici paket (`requests`) taşımıyordu ve modern python virtualenv'leri aranmıyordu.

#### 5.2. Devreye Alınan Mimari Düzeltmeler:
1. **Çoklu Yol ve Uzak Yedek Arama (Multi-Path Discovery & Fallback):**
   - Betik; `ROOT`, `server-scripts/data`, `workspace/src/backend/src/data`, `data/` ve `dist/data` yollarındaki adayları tarar.
   - Yerelde bulunamazsa GitHub açık veri deposundan standart kütüphane (`urllib.request`, SSL ve no-deps) ile güvenli çeker.
2. **Sıfır-Kayıt Güvenlik Kalkanı (Zero-Record Guard):**
   - Kaynaklardan 0 istasyon dönmesi durumunda `save_stations_atomically` işlemi durdurur ve mevcut geçerli veri dosyasını (`cpo_stations.json`) KESİNLİKLE EZMEZ.
3. **Atomik Yazma ve Otomatik Yedekleme (.bak & .tmp):**
   - Veriler önce `.tmp` dosyasına yazılır, bütünlüğü doğrulandıktan sonra atomik olarak `replace` edilir; önceki sürüm `.bak` olarak saklanır.
4. **Akıllı Python Tespiti:**
   - `cron_daily_sync.sh` sırasıyla `.venv`, `venv`, cPanel EA-Python (`ea-python311`), CloudLinux Alt-Python (`alt/python311`) ve sistem python3 yollarını dener.
5. **Dağıtım Arşivi Tohum Paketleme (`deploy.yml`):**
   - `cpo_stations.json` hem backend hem de `server-scripts/data` altına tohum olarak paketlenip cPanel sunucusuna gönderilir.

#### 5.3. Sprint 13 Sağlık ve Doğrulama Denetimi:
```bash
./scripts/healthcheck-s13.sh
```

---

### 6. Docker Compose ile Yerel Geliştirme

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

### 7. Staging (Hazırlık) Ortamı Dağıtımı

```bash
# 1. Staging ortam değişkenlerini kontrol edin
cp env/.env.staging.example env/.env.staging

# 2. Staging dağıtım betiğini çalıştırın (Otomatik BUILD_ID üretir ve doğrular)
./scripts/deploy-staging.sh

# 3. Sağlık denetimlerini çalıştırın
./scripts/healthcheck-s3.sh
./scripts/healthcheck-s11.sh
./scripts/healthcheck-s13.sh
```

---

### 8. Üretim (Production) Dağıtımı

```bash
# 1. Üretim ortam dosyasını hazırlayın ve güvenli anahtarları tanımlayın
cp env/.env.production.example env/.env.production

# 2. Üretim dağıtım betiğini çalıştırın (TALEP-012 Build ID enjeksiyonu ve Zero-Downtime)
./scripts/deploy-production.sh

# 3. Sistem ve Sürüm Sağlık Denetimlerini çalıştırın
./scripts/healthcheck-s5.sh
./scripts/healthcheck-s11.sh
./scripts/healthcheck-s13.sh
```

---

### 9. Servis ve Port Haritası

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

### 10. Yasal ve Mimari Kısıtlar Bildirimi

- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK lisansına tabi elektrik satışı ve faturalama yapamaz (zorunlu).
- **Konum Gizliliği (KVKK):** Kullanıcı GPS koordinatları sunucuda kesinlikle saklanamaz; yalnızca istemci belleğinde (in-memory) işlenir (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve anlık doluluk Faz 1'de `NULL` kabul edilir; mock uydurma veri üretilemez (zorunlu).
- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
