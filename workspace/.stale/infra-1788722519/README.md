
# elektriklioto.com — PostGIS Veritabanı ve Migration Altyapısı (Sprint S1)

> **Sprint Hedefi (S1):** Kullanıcının web haritası üzerinde Türkiye'deki tohumlanmış şarj istasyonlarını BBox ile görüntüleyip filtreleyebilmesi.  
> **Görev:** Docker PostGIS veritabanı konteyneri ve sürümlenmiş şema migration altyapısının kurulması.

---

## 1. Mimari Kararlar ve Zorunlu Kısıtlar

- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Veritabanı İmajı:** `postgis/postgis:16-3.4` sürümü sabitlenmiş imaj ve depoya işlenmiş `docker-compose.yml` ile ayağa kaldırılır (zorunlu).
- **Lisans Sınırı:** Platform yasal olarak bir e-Mobilite Asistanı / EMP adayı statüsündedir; lisanslı şarj operatörü değildir, elektrik satışı veya faturalama yapamaz (zorunlu).
- **KVKK Sıfır Konum Saklama:** Kullanıcı GPS koordinatları sunucuda saklanamaz; `station_report` tablosunda konum veya IP tutulmaz, yalnızca `proximity_verified` bayrağı tutulur (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Kanonik İstasyon Kimliği:** Resmî EPDK `istasyon_no` (`ŞRJ/xxxx`) tekil doğal anahtardır; dahili anahtar UUIDv7'dir (`station.id`).
- **Eksik Veri (Nullable DTO):** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında `NULL` olarak saklanır; uydurma veri girilemez (zorunlu).
- **Spatial İndeks:** BBox sorgularında p95 < 40ms için `station(geom)` üzerinde GIST indeksi (`idx_station_geom`) zorunludur.

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Veritabanı ve migration altyapısı ortamda doğrulanmış `node v22.21.0`, `npm 10.9.4` ve `Docker 29.8.0` ile çalıştırılmaktadır.

---

## 2. Eksik Araçlar ve Kurulum Adımları

`workspace/docs/ortam_raporu.md` analizi neticesinde tespit edilen eksik araçlar ve tedarik adımları:

1. **Docker PostGIS İmajı Çekimi:**
   - Ortamda `Docker 29.8.0` mevcuttur. PostGIS 16-3.4 imajı yerel depoya çekilmelidir:
   ```bash
   docker pull postgis/postgis:16-3.4
   ```

2. **pnpm Paket Yöneticisi Kurulumu:**
   - Monorepo ve çalışma alanı paketleri için pnpm kurulmalıdır:
   ```bash
   npm install -g pnpm@10.20.0
   ```

3. **Flutter & Dart SDK Onarımı (Geliştirici Makinesi):**
   - Darwin arm64 (Apple Silicon) mimarisine uygun Flutter 3.27+ SDK'sı `fvm` veya resmi arşivden indirilip PATH'e eklenmelidir:
   ```bash
   # Örnek arm64 Flutter kurulumu
   curl -O https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.27.1-stable.zip
   unzip flutter_macos_arm64_3.27.1-stable.zip -d $HOME/development/
   export PATH="$HOME/development/flutter/bin:$PATH"
   ```

---

## 3. Çalıştırma ve Doğrulama Adımları

### 3.1. Konteyneri Başlatma
```bash
# Gerekli ortam değişkenlerini kopyala
cp .env.example .env

# PostGIS konteynerini arka planda başlat
npm run db:up
# veya: docker compose up -d
```

### 3.2. Sürümlenmiş Migration'ları Çalıştırma
```bash
# Bağımlılıkları yükle (npm veya pnpm)
npm install

# Sıralı, işlem garantili (transactional) migration'ları uygula
npm run db:migrate
```

### 3.3. Altyapı ve PostGIS Doğrulama Suite'ini Koşma
```bash
# Veritabanı, PostGIS eklentisi, spatial indeks ve KVKK denetimini gerçekleştir
npm run db:verify
```
