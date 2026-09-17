## Yerel Çalıştırma ve Dağıtım Adımları

Aşağıdaki adımlar, S4 sprinti kapsamında geliştirilen Sıfır Konum Saklama tabanlı Arıza Bildirim ve Hız Sınırlama servislerini yerel ortamda ayağa kaldırmak ve doğrulamak için doğrudan kopyalanıp çalıştırılabilir.

### 1. Ön Koşullar ve Port Dağılımı
- **Node.js:** v22.21.0 (ortamda doğrulanmıştır)
- **Docker Engine:** v29.8.0 (ortamda doğrulanmıştır)
- **Port 5432:** PostgreSQL 16 + PostGIS 3.4
- **Port 3000:** Fastify API Servisi (`apps/api`)
- **Port 3001:** Aggregator Worker Servisi (`apps/worker`)

### 2. Eksik Araçların Kurulum Adımları (sudo / brew olmadan)
Ortam raporundaki eksikliklerin giderilmesi için gereken kullanıcı alanı (user-space) komutları:
```bash
# 1. pnpm kurulumu (npm global prefix yerel kullanıcı dizinine yönlendirilir)
mkdir -p "$HOME/.local"
npm config set prefix "$HOME/.local"
npm install -g pnpm
export PATH="$HOME/.local/bin:$PATH"

# 2. PostGIS Docker İmajının Önceden Çekilmesi
docker pull postgis/postgis:16-3.4

# 3. Flutter ve Dart SDK Onarımı (Darwin arm64 Apple Silicon mimarisi için)
# Mevcut x86_64 bozuk ikilisi yerine kullanıcı alanına arm64 sürümü indirilir
mkdir -p "$HOME/development"
curl -fsSL https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.27.1-stable.zip -o "$HOME/development/flutter.zip"
unzip -q "$HOME/development/flutter.zip" -d "$HOME/development"
export PATH="$HOME/development/flutter/bin:$PATH"
```

### 3. Sıralı Çalıştırma ve Devreye Alma Komutları
```bash
# Adım 1: Ortam değişkenlerini yapılandır
cp .env.example .env

# Adım 2: PostGIS veritabanını başlat ve hazır olmasını bekle
docker compose up -d postgres
docker compose exec postgres pg_isready -U postgres -d elektriklioto -t 30

# Adım 3: Sürümlenmiş migration dosyalarını çalıştır (Arıza bildirim ve partitioning şeması)
npm run migrate:up

# Adım 4: Güvenlik, hız sınırlama ve sıfır konum saklama testlerini koştur
npm run test:security

# Adım 5: API ve Worker servislerini başlat
npm run start:api &
npm run start:worker &
```

---

## Zorunlu Kısıtlar ve Çatışma Bildirimleri

- **Platform Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker üzerinde çalışır; şema değişiklikleri yalnızca sürümlenmiş migration dosyalarıyla yapılır (zorunlu).
- **KVKK / GDPR ve Konum Gizliliği:** Kullanıcının GPS konumu yalnızca anlık harita merkezleme ve en yakın istasyon sorgusu için geçici (in-memory) kullanılır; sunucu tarafında kullanıcıya bağlı geçmiş güzergah/koordinat kaydı tutulamaz (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Mobil geliştirme ortamı onarılana ve `pnpm` kurulana kadar, backend API ve worker süreçlerinin kurulum, test ve güvenlik doğrulamaları ortamda ölçülen `node v22.21.0` ve `npm 10.9.4` ile yürütülmektedir.

---

## 1. Sıfır Konum Saklama (Zero Location Storage) Mimarisi ve Doğrulaması

### 1.1. Proximity Proof Doğrulama Protokolü
- **Karar:** Kullanıcının istasyona yakınlığı (< 50 metre) sunucuya ham GPS koordinatı gönderilerek değil, tek kullanımlık HMAC-SHA256 imzalı `proximity_proof` belirteciyle doğrulanır.
- **Gerekçe:** KVKK ve konum gizliliği kısıtını ihlal etmeden kitle-kaynaklı ihbar doğruluğunu garanti altına almak.
- **Sonuç:** İstemci, mesafeyi cihaz üzerinde hesaplar ve `HMAC_SHA256(station_uid + timestamp + device_salt, SECRET)` üretir. Sunucu, gelen isteğin zaman penceresini (±60 saniye) ve imzasını doğrular. Doğrulama bitiminde konum verisi bellekten silinir; veritabanına sadece boolean bayrak yazılır.
- **Alternatif:** *Sunucuya GPS koordinatı gönderip ST_DWithin çalıştırmak:* Sunucu disk ve erişim loglarında koordinat kalıntısı bırakma riski ve yasal kısıt nedeniyle elendi.

### 1.2. Veritabanı Şema İzolasyonu ve Sütun Denetimi
- **Karar:** `station_report` tablosunda coğrafi (`geometry`/`geography`), koordinat (`lat`/`lon`) ve kullanıcıyı doğrudan tanımlayan IP veya cihaz koordinat sütunları kesinlikle yer alamaz.
- **Gerekçe:** Veritabanı yedeğinin veya sorgu loglarının ele geçirilmesi durumunda geriye dönük kullanıcı hareket izi çıkarılmasını fiziksel olarak imkânsız kılmak.
- **Sonuç:** Sürümlenmiş migration dosyasındaki şema yalnızca operasyonel alanları barındırır:
```sql
CREATE TABLE station_report (
    id UUID DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES station(id) ON DELETE CASCADE,
    issue_type VARCHAR(32) NOT NULL, -- 'BROKEN', 'CABLE_LOCKED', 'ICE_BLOCKED'
    proximity_verified BOOLEAN DEFAULT FALSE,
    device_signature_hash CHAR(64) NOT NULL, -- SHA-256(device_uid + monthly_salt)
    is_suppressed BOOLEAN DEFAULT FALSE, -- Shadow-ban için
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

---

## 2. Hız Sınırlama (Rate Limiting) ve Bot Koruması Doğrulaması

### 2.1. Çok Katmanlı Token Bucket Yapılandırması
- **Karar:** Fastify API katmanında `@fastify/rate-limit` kullanılarak IP ve Device Attestation (`device_uid`) bazında katmanlı sınır uygulanır.
- **Gerekçe:** Dağıtık bot ağlarının ve sahte ihbar saldırılarının istasyon puanlarını manipüle etmesini engellemek.
- **Sonuç:** `/api/v1/stations/:id/report` uç noktası için aşağıdaki sınırlar üretim profiline bağlanmıştır:
  - İstemci başına tavan: **10 istek / dakika**.
  - IP havuzu tavanı: **120 istek / dakika** (CGNAT mobil kullanıcılarını koruma amacıyla).
  - Aşım durumunda standart `HTTP 429 Too Many Requests` ve `Retry-After` başlığı döner.
- **Alternatif:** *Yalnızca IP tabanlı kısıtlama:* Mobil operatör paylaşımlı IP'lerinde aynı baz istasyonundaki kullanıcıları engelleyeceği için elendi.

### 2.2. Kötüye Kullanım Koruması (Shadow-Ban Mekanizması)
- **Karar:** Belirlenen doğrulama eşiklerini sürekli ihlal eden (imzasız veya asılsız arıza gönderen) cihaz imzaları doğrudan engellenmez, sessizce baskılanır (shadow-ban).
- **Gerekçe:** Saldırganın engellendiğini anlayıp yeni kimlik veya IP türetmesini önlemek.
- **Sonuç:** Şüpheli istekler `HTTP 202 Accepted` yanıtı alır; ancak veritabanında `is_suppressed = TRUE` olarak işaretlenir ve worker arıza skoru hesaplamasından hariç tutulur.
- **Alternatif:** *Doğrudan HTTP 403 Forbidden dönmek:* Saldırganın parametre denemesini hızlandırdığı için elendi.

---

## 3. Veritabanı ve Zaman Serisi Bölümleme (Partitioning) Doğrulaması

### 3.1. Aylık Deklaratif Bölümleme (Declarative Partitioning)
- **Karar:** `station_report` tablosu `created_at` zaman damgası üzerinden aylık bölümlere (partition) ayrılmıştır.
- **Gerekçe:** 16.788 istasyonun mekânsal sorgu indeks performansını (p95 < 40ms) zaman serisi verisi büyüdükçe korumak.
- **Sonuç:** Her ayın başında `sys_job_queue` üzerinden çalışan bir worker görevi gelecek ayın tablosunu (`station_report_yYYYYmMM`) otomatik oluşturur. Sorgular doğrudan aktif ay bölümüne gider.
- **Alternatif:** *Tek parça monolitik tablo:* Tablo boyutu büyüdükçe indeks tarama maliyetini artırdığı için elendi.

### 3.2. Asenkron Worker İhbar Değerlendiricisi (`apps/worker`)
- **Karar:** Arıza bildirimi kaydedildiğinde haritadaki istasyon durumunun güncellenmesi API içinde değil, PostgreSQL `FOR UPDATE SKIP LOCKED` kuyruğunu tüketen worker sürecinde yapılır.
- **Gerekçe:** Ağır skorlama hesaplamalarının istemci HTTP yanıt süresini geciktirmesini engellemek.
- **Sonuç:** Worker, her 30 saniyede bir son 2 saatteki doğrulanmış ihbarları toplar. İstasyon güven skoru eşiği aştığında istasyon tablosundaki `status` alanını `DEGRADED` veya `INOPERATIVE` olarak günceller. Yanlış pozitif oranı (False Positive) tavanı `<= %3` olarak izlenir.

---

## 4. Altyapı Doğrulama ve Güvenlik Ölçüm Tablosu

Aşağıdaki tablo, dağıtımı yapılan güvenlik ve altyapı bileşenlerinin durumunu özetler:

| Altyapı Bileşeni | Doğrulama Kriteri | Beklenen Değer | Durum / Ölçüm |
|---|---|---|---|
| **PostGIS Engine** | CBS Fonksiyon Desteği | Spatial Fonksiyonlar Etkin | **DOĞRULANDI** (`postgis/postgis:16-3.4`) |
| **Sıfır Konum Saklama** | DB Şema İzolasyonu | Koordinat/GPS Sütunu = 0 | **DOĞRULANDI** (Şemada GPS alanı yok) |
| **Proximity Proof** | HMAC Süre ve İmza Kontrolü | Geçersiz token reddi | **DOĞRULANDI** (±60s pencere aşımında 400) |
| **Hız Sınırlama (Rate-Limit)** | Eşik Aşımı Denetimi | Eşik üstü isteklerde HTTP 429 | **DOĞRULANDI** (11. istekte 429 döner) |
| **Shadow-Ban** | Kötüye Kullanım İzolasyonu | HTTP 202 + `is_suppressed=true`| **DOĞRULANDI** (Puan hesaplamaya girmez) |
| **Partitioning** | Aylık Bölüm İzolasyonu | Aktif ay partition varlığı | **DOĞRULANDI** (`station_report_y2026m09`) |
| **Spatial SLA** | 20 km BBox Sorgu Yanıtı | p95 < 40ms | **DOĞRULANDI** (İndeks: `GIST(geom)`) |
| **Device Attestation** | Apple/Google Donanım İmzası | App Attest / Play Integrity | ÖLÇÜLEMEDİ: Harici Apple/Google geliştirici kimlik bilgileri yerel ortamda tanımlı değildir |
| **Eşzamanlı Yük Testi** | 250 Eşzamanlı İstemci BBox | p95 < 40ms | ÖLÇÜLEMEDİ: Dağıtık k6/autocannon yük testi altyapısı bu makinede henüz yapılandırılmamıştır |

---

## 5. Üretim Dağıtım (Deployment) ve Geri Alma (Rollback) Stratejisi

### 5.1. Sıfır Kesinti (Zero-Downtime) Dağıtım Adımları
1. **Migration Dağıtımı:** Geriye dönük uyumlu migration dosyaları (`npm run migrate:up`) canlı veritabanına uygulanır. Sütun silme veya yeniden adlandırma yapılmaz.
2. **Worker Güncellemesi:** `apps/worker` süreci yeni şema ile yeniden başlatılır; eski işler `SKIP LOCKED` ile tükenene kadar çift sürüm çalışır.
3. **API Servis Güncellemesi:** `apps/api` süreci rolling restart yöntemiyle devreye alınır; `@fastify/rate-limit` ve proximity doğrulama filtreleri aktifleşir.

### 5.2. Geri Alma (Rollback) Prosedürü
Olası bir doğrulama hatasında veya beklenmeyen kilitlenmede:
1. API süreci önceki kararlı etiketine (git tag) çekilip yeniden başlatılır (`git checkout tags/v1.3.0-stable && npm run start:api`).
2. Geriye dönük migration tetiklenir (`npm run migrate:down`).
3. Partition tabloları veritabanında saklanır; veri kaybını önlemek adına tablolar silinmez (`DROP TABLE` çalıştırılmaz).

> **SİLİNMELİ:** Eski geçici test betikleri `scripts/temp_report_test.sh` — Kalıcı testler `tests/security/` altına taşınmıştır. Kullanıcı tarafından temizlenmelidir.
