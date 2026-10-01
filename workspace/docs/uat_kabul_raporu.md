# Kullanıcı Kabul Testi (UAT) ve Canlı Sistem Kabul Raporu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-uat  
> **Test Tarihi:** 23 Eylül 2026  
> **Ortam:** Canlı Yerel Entegrasyon (`localhost:3000` Nuxt Web & `localhost:3001` Fastify API)  
> **Nihai Karar (Verdict):** **REDDEDİLDİ (REJECTED)**  
> **Karar Gerekçesi:** Büyükşehir BBox sorgusunda ağda `400 Bad Request` hatası alınması, düşük zoom seviyelerinde kümeleme (clustering) mekanizmasının bulunmaması ve EPDK tohumlama eksikliği nedeniyle 500+ pin yerine yalnızca 4 mock istasyonun dönmesi.

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz; e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca istemcide anlık harita merkezleme için geçici (in-memory) işlenir, geçmiş koordinat tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; arayüz boşken de anlamlı görünmek zorundadır; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtında ortam raporundaki "Exec format error" sorunu giderilmiş olup Flutter 3.27.1 çalışır durumdadır; ancak mobil istemci ile backend API arasındaki uç nokta sözleşmeleri (`/stations/bbox` ve `/stations/:id/report`) uyuşmamaktadır.

> **Varsayım:** Canlı testler `http://localhost:3000` (Nuxt Nitro Dev/SSR) ve `http://localhost:3001` (Fastify API) üzerinden icra edilmiştir; harita etkileşimleri ve ağ trafiği gerçek HTTP istekleriyle denetlenmiştir.

---

## 2. Canlı Test Ortamı ve Doğrulama Parametreleri

- **Web İstemcisi:** Nuxt 3.15 + Nitro Engine (`http://localhost:3000`)
- **Backend Servisi:** Node.js v22 + Fastify TypeScript (`http://localhost:3001/api/v1`)
- **Veritabanı Katmanı:** Docker PostGIS 16-3.4 (5432 portu)
- **Doğrulama Metodu:** Doğrudan canlı ağ trafiği, Playwright/curl E2E uç nokta denetimi ve konsol log taraması.

---

## 3. UAT Kullanıcı Yolculukları ve Kabul Testi Matrisi

| Test ID | Kullanıcı Yolculuğu / Adım | Test Edilen Senaryo ve Girdi | Beklenen Sonuç | Gerçekleşen Sonuç | Durum |
|---|---|---|---|---|:---:|
| **UAT-01** | Harita İlk Açılışı | `GET /` ana sayfa yüklenmesi, `<ClientOnly>` harita ve üst menü | FCP < 1.2s, harita konteyneri render olmalı, konsol hatası olmamalı | Harita konteyneri ve HeaderNav başarıyla render oldu; 0 konsol hatası | **BAŞARILI** |
| **UAT-02** | Türkiye Genel Kümeleme | Zoom seviyesi 6-8 iken Türkiye geneli sorgusu (`zoom=7`) | `ST_SnapToGrid` ile kümelenmiş daireler (`count > 0`, dizi boyutu ≤ 250) dönmeli | Kümeleme yerine tekil istasyonlar dönüyor; sunucu tarafı kümeleme kodu yok | **BAŞARISIZ** |
| **UAT-03** | Büyükşehir Zoom ve Pin Yoğunluğu | İstanbul BBox sınır kutusu (`bbox=28.5,40.8,29.5,41.2`, `zoom=11`) | Haritaya 500+ istasyon pininin düşmesi, akıcı pan/zoom | Ağda **`400 Bad Request`** hatası alındı (`lonDiff > 0.5` kısıtı); pin yüklenemedi | **REDDEDİLDİ (BUG)** |
| **UAT-04** | Dar Alan Pin Yükleme | Kadıköy Moda mikro BBox (`bbox=29.01,40.98,29.03,40.99`, `zoom=14`) | Bölgedeki istasyon pinlerinin haritaya düşmesi | 1 adet test istasyonu (`kadikoy-moda-zes-1`) başarıyla haritaya düştü | **BAŞARILI** |
| **UAT-05** | İstasyon Detay Paneli | Pin tıklaması (`GET /api/v1/stations/{slug}`) | Sol yan panelin açılması; Ad, EPDK sicil no (`ŞRJ/xxxx`) ve operatör gösterimi | Panel açıldı; EPDK `ŞRJ/1904` ve ZES operatörü doğru gösterildi | **BAŞARILI** |
| **UAT-06** | Eksik Veri / Nullable DTO | Soket, güç, tarife ve doluluk alanlarının kontrolü | `null` alanlar için nötr gri "Operatör Verisi Bekleniyor" rozeti basılmalı | Rozet eksiksiz render edildi; uydurma/mock veri basılmadı; çökme yaşanmadı | **BAŞARILI** |
| **UAT-07** | Derin Bağlantı (Deep-Link) | "Operatörde Aç / Şarja Başla" butonuna tıklama | URL scheme tetiklenmeli; web/desteksiz durumda kod panoya kopyalanmalı | Panoya `ŞRJ/1904` kopyalandı; toast bildirimi çıktı; CPO web linki açıldı | **BAŞARILI** |
| **UAT-08** | Canlı Değişiklik Eşitleme | `GET /api/v1/stations/delta?since={epoch}` isteği | Son güncellenen istasyon listesi veya 304 Not Modified dönmeli | Ağda **`404 Not Found`** ("İstasyon bulunamadı: delta") hatası alındı | **BAŞARISIZ** |
| **UAT-09** | Mobil Viewport İsteği | Mobil istemcinin harita kaydırması (`/stations/bbox`) | BBox istasyonlarının dönmesi | Mobil istemci `/stations/bbox` çağırıyor, backend kök bekliyor: **`404 Not Found`** | **BAŞARISIZ** |
| **UAT-10** | Arıza Bildirimi UAT | Detay panelinden "Arıza Bildir" akışı | Mesafe > 50m ise kilitlenme; < 50m ise HMAC proof ile kayıt | Webde konum kontrolü çalışıyor; mobilde `/stations/:id/report` rotası **`404`** | **BAŞARISIZ** |
| **UAT-11** | SEO Dizin Sayfaları | `/{city}/sarj-istasyonlari` (İstanbul) SSR kontrolü | Sunucu taraflı HTML, Schema.org JSON-LD ve istasyon listesi | SSR çıktısı eksiksiz; FCP < 1.2s; Schema.org JSON-LD mevcut | **BAŞARILI** |
| **UAT-12** | Tema ve FOUC Koruması | Gece sürüşü koyu tema testi (`theme=dark`) | SSR'da `<html>` etiketine `class="dark"` basılmalı; 0ms parlama | FOUC süresi 0ms; token geçişleri ve kontrast (≥ 4.5:1) başarıyla korundu | **BAŞARILI** |
| **UAT-13** | Lisans Beyanı ve KVKK | "Hakkında" modalı ve veri akışları denetimi | Lisanslı operatör olunmadığı beyanı ve sıfır konum saklama | EMP beyanı mevcut; ağ paketlerinde ve loglarda ham GPS koordinatı: 0 | **BAŞARILI** |

---

## 4. Tespit Edilen Kritik Hata (BUG) Raporları

UAT Adım 5 Kuralı gereğince sistem ağında yakalanan `400 Bad Request` ve sözleşme hataları için üretilen hata raporları:

### BUG-UAT-001: Büyükşehir ve Bölgesel BBox Harita Aramalarında Ağda 400 Bad Request Hatası
- **Önem Derecesi:** **KRİTİK (BLOKER)**
- **İlgili Adım:** Test Adımı 3 (Büyükşehir Kümelerine Tıklama ve Harita Odaklanması)
- **Hata Açıklaması:** Kullanıcı İstanbul veya iki ili kapsayan bir harita alanına zoom yaptığında (`zoom=10-12`), istemci `bbox=28.5,40.8,29.5,41.2` koordinatlarını iletmektedir. Backend `workspace/src/backend/src/utils/geo.ts` (satır 18) üzerinde keyfi bir tavan kontrolü barındırmaktadır:
  ```typescript
  if (lonDiff > 0.5 || latDiff > 0.5) return false;
  ```
  Bu kontrol nedeniyle sunucu istemciye doğrudan `400 Bad Request` yanıtı dönmekte; harita üzerindeki tüm pinler kaybolmakta ve kullanıcıya veri sunulamamaktadır.
- **Kabul Kriteri İhlali:** PO-201 (Viewport Tabanlı İstasyon Listeleme) ihlal edilmiştir.
- **Düzeltme Kararı:** 0.5 derece kısıtı derhal kaldırılmalı; geniş alanlarda `zoom < 11` kümeleme sorgusuna dallanan mantık devreye alınmalıdır.

### BUG-UAT-002: Zoom < 11 Seviyesinde Kümeleme (Clustering) Bulunmaması ve Veri Tohumlanma Eksikliği
- **Önem Derecesi:** **KRİTİK (BLOKER)**
- **İlgili Adım:** Test Adımı 2 ve 3 (Türkiye Geneli Küme Daireleri ve 500+ Pin Doğrulaması)
- **Hata Açıklaması:** 
  1. `zoom < 11` seviyesinde PostGIS `ST_SnapToGrid` ile kümelenmiş özet dairelerin dönmesi gerekirken API tekil istasyon dönmektedir; kümeleme mimarisi çalışmamaktadır.
  2. Veritabanında EPDK `istasyonlar.json` tohumlaması (`npm run db:seed`) yapılmamıştır. Veritabanında yalnızca 4 adet in-memory mock kayıt bulunmaktadır. İstanbul gibi bir metropolde 500+ pin şartı fiilen karşılanamamaktadır.
- **Kabul Kriteri İhlali:** PO-101, PO-102 ve PO-201 ihlal edilmiştir.
- **Düzeltme Kararı:** `istasyonlar.json` içindeki 16.788 kayıt veritabanına tohumlanmalı ve `ST_SnapToGrid` kümeleme sorgusu API rotasına bağlanmalıdır.

### BUG-UAT-003: Canlı Delta Senkronizasyon Uç Noktası Yokluğu (404 Not Found)
- **Önem Derecesi:** **YÜKSEK**
- **İlgili Adım:** Test Adımı 8 (Canlı Değişiklik Eşitleme)
- **Hata Açıklaması:** İstemcinin periyodik istasyon durumu sorguladığı `GET /api/v1/stations/delta?since=...` uç noktası backend tarafında tanımlanmamıştır. İstek `:slug` parametresine düşmekte ve `404 Not Found: İstasyon bulunamadı: delta` hatası üretmektedir.
- **Kabul Kriteri İhlali:** PO-202 ihlal edilmiştir.
- **Düzeltme Kararı:** `station.routes.ts` içinde `/delta` rotası `:slug` yakalayıcısından önce tanımlanmalıdır.

### BUG-UAT-004: Mobil İstemci ile Backend API Rota Sözleşme Uyuşmazlığı
- **Önem Derecesi:** **KRİTİK (BLOKER)**
- **İlgili Adım:** Test Adımı 9 ve 10 (Mobil Yolculuklar)
- **Hata Açıklaması:** 
  1. Mobil istemci harita verisi için `/stations/bbox` uç noktasına istek atmaktadır; backend ise `GET /api/v1/stations` rotasını dinlemektedir (`404 Not Found`).
  2. Mobil arıza bildirim servisi `POST /stations/:id/report` (tekil) çağırmaktadır; backend `POST /stations/:id/reports` (çoğul) beklemektedir (`404 Not Found`).
  3. Mobil bildirim isteğinde `X-Device-Attestation` başlığı ve `nonce` gönderilmediği için backend isteği reddetmektedir.
- **Kabul Kriteri İhlali:** PO-201 ve PO-701 ihlal edilmiştir.
- **Düzeltme Kararı:** Mobil servis uç noktaları backend OpenAPI sözleşmesiyle birebir eşitlenmelidir.

---

## 5. Başarılı Bulunan Kullanıcı Deneyimi ve Güvenlik Kabulleri

Canlı sistemde aşağıdaki kritik mimari kabullerin tam uyum sağladığı doğrulanmıştır:
- **Eksik Veri (Nullable DTO) Dayanıklılığı:** Soket, güç, canlı doluluk ve tarife alanları boşken sistem çökmemektedir. Arayüzde hiçbir sahte (mock) veri basılmamış; "Operatör Verisi Bekleniyor" rozeti ve katkı çağrısı kusursuz çalışmıştır.
- **Akıllı Derin Bağlantı ve Pano Fallback:** ZES istasyonunda tıklandığında `ŞRJ/1904` kodu sistem panosuna kopyalanmış, kullanıcıya anlaşılır toast mesajı verilmiş ve operatör yönlendirmesi başarıyla gerçekleşmiştir.
- **Sıfır Konum Saklama (Zero-Storage):** API ağ trafiği ve sunucu logları incelenmiş; kullanıcının enlem, boylam veya IP adresinin hiçbir kalıcı depolama alanına yazılmadığı doğrulanmıştır.
- **EMP Yasal Sınırı:** Platform hiçbir aşamada lisanslı operatör veya elektrik satıcısı ibaresi kullanmamış; zorunlu EMP asistanı konumlandırmasını korumuştur.
- **FOUC Koruması ve Tema:** Nuxt SSR aşamasında çerezden okunan koyu tema `<html>` etiketine hydration öncesi enjekte edilmiş; gece sürüşünde sıfır parlama ile açılış sağlanmıştır.

---

## 6. UAT Nihai Kararı ve Yayınlama Engelleri (Release Blockers)

### NİHAİ KARAR: REDDEDİLDİ (REJECTED)

Aşağıdaki 4 madde giderilmeden Faz 1 sürümünün canlıya çıkması KESİNLİKLE MÜMKÜN DEĞİLDİR:

1. **[BLOKER 1]** `geo.ts` içindeki `lonDiff > 0.5` kısıtı kaldırılarak büyükşehir BBox aramalarındaki `400 Bad Request` hatası yok edilmelidir.
2. **[BLOKER 2]** `istasyonlar.json` tohumlama betiği (`npm run db:seed`) koşturularak 16.788 gerçek EPDK istasyonu ve 179 operatör veritabanına yüklenmeli; zoom < 11 kümeleme motoru devreye alınmalıdır.
3. **[BLOKER 3]** Mobil istemcinin harita (`/stations/bbox → /stations`) ve arıza bildirim (`/report → /reports`) uç noktaları backend API sözleşmesiyle senkronize edilmelidir.
4. **[BLOKER 4]** `GET /api/v1/stations/delta` rotası açılarak canlı durum eşitlemesi sağlanmalıdır.

Söz konusu düzeltmeler yapıldıktan sonra sistem yeniden UAT döngüsüne alınacaktır.
