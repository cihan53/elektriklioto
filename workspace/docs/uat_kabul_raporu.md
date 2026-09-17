# Kullanıcı Kabul Testleri (UAT) ve Canlı Sistem Kabul Raporu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Denetçi Rolü:** Kullanıcı Kabul Testçisi (UAT & Real-User Journey Auditor)  
> **Denetim Tarihi:** 2026-09-17  
> **Test Ortamı:** Canlı Sistem — Nuxt 3 Web (localhost:3000) & Fastify API (localhost:3001) & PostgreSQL PostGIS (localhost:5432)  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `kabul_kriterleri.md`, `ekran_envanteri.md`, `ux_akislari.md`, `test_raporu.md`  
> **Nihai Karar:** **GÖREV REDDİ (VERDICT: REJECTED / UAT FAILED)**

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Sistemin tartışmaya kapalı temel kısıtları doğrultusunda tüm kullanıcı kabul testleri aşağıdaki zemin üzerinde icra edilmiştir:
- **Platform Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz; yasal statü e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS koordinatları sunucuda saklanamaz; yalnızca istemcide anlık harita merkezleme için geçici (in-memory) kullanılır; sunucu tarafında kullanıcıya bağlı geçmiş güzergah/koordinat kaydı tutulamaz (zorunlu).
- **Veritabanı Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Erişilebilirlik Tabanı:** WCAG 2.1 AA tabandır; metin kontrastı ≥ 4.5:1, dokunma hedefleri webde ≥ 44x44 CSS px, mobilde ≥ 48x48 pt olmalıdır (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır; `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; arayüz boşken de anlamlı görünmelidir; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için derleme ortamının onarımı zorunludur.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Geliştiricinin veya QA'in yazdığı izole birim testlere ve mock verilere kesinlikle itibar edilmemiştir. UAT denetimleri; Docker üzerindeki PostGIS veritabanı (5432), canlı Fastify API servisi (localhost:3001) ve canlı Nuxt 3 web uygulaması (localhost:3000) üzerinde Chromium headless ve curl E2E oturumlarıyla icra edilmiştir.

> **Varsayım:** Soket tipi, güç, tarife ve canlı doluluk Faz 1 EPDK veri setinde bulunmadığından, arayüzde bu alanlar için "Operatör Verisi Bekleniyor" nötr rozetinin gösterilmesi ve tıklandığında katkı modalının açılması kabul edilebilir kullanıcı deneyimidir.

---

## 2. Canlı UAT Adım Adım İcra Özeti (Test Protocol Execution)

Canlı ortamda (localhost:3000 web & localhost:3001 API) icra edilen 5 zorunlu test adımının somut bulguları:

### Adım 1: Canlı Web Haritasına Bağlanma
- **İcra Yöntemi:** Playwright Chromium ve HTTP istemcisiyle `http://localhost:3000/` ve `http://localhost:3001/` uç noktalarına bağlanıldı.
- **Ölçüm:** Nuxt 3 SSR motoru HTTP 200 yanıtı verdi. HTML DOM içinde `<ClientOnly>` MapLibre GL harita kabuğu başarıyla ayağa kalktı. API sağlık denetimi (`GET /api/v1/health/sources`) HTTP 200 ile doğrulandı.
- **Durum:** **GEÇTİ (PASS)**.

### Adım 2: Türkiye Genelindeki Kümeleme (Clustering) Dairelerini Kontrol Etme
- **Kabul Eşiği:** Harita ilk açılışta (Zoom 6, Türkiye merkezi) ülke genelini kapsar; harita üzerindeki kümeleme dairelerinin sayısı `> 0` olmalıdır (`.cluster-marker`).
- **Ölçüm:** Canlı DOM'da bulunan kümeleme dairesi sayısı tam olarak **0 (SIFIR)**.
- **Kök Neden:**
  1. Harita ilk açıldığında `useStations.ts` ülke BBox koordinatlarını (`minLon=25.82, minLat=37.39, maxLon=39.89, maxLat=42.37&zoom=6`) backend'e iletmektedir (`lonDiff = 14.06 derece`).
  2. Backend `workspace/src/backend/src/utils/geo.ts:18` satırında yer alan keyfi `if (lonDiff > 0.5 || latDiff > 0.5) return false;` kuralı nedeniyle isteği reddetmekte ve **`HTTP 400 Bad Request`** dönmektedir.
  3. Ayrıca Fastify `station.routes.ts` içinde `zoom < 11` kümeleme yanıt şeması (`{ type: 'clusters', data: ClusterItem[] }`) ve PostGIS `ST_SnapToGrid` sorgusu hiç kodlanmamıştır.
- **Durum:** **BAŞARISIZ (FAIL)**.

### Adım 3: İstanbul Kümelerine Tıklama, Zoom 10-12 Seviyelerine Uçma, 500+ İstasyon Pini Teyidi
- **Kabul Eşiği:** İstanbul BBox alanına (Zoom 11) odaklanıldığında haritaya en az 500+ istasyon pini (`.station-pin`) düşmelidir.
- **Ölçüm:** Haritaya düşen istasyon pini sayısı tam olarak **0 (SIFIR)**.
- **Kök Neden:**
  1. İstanbul genelini kapsayan sınır kutusu (`bbox=28.42962,40.84865,29.48826,41.22010&zoom=11`) sorgulandığında `lonDiff = 1.05864 > 0.5` olduğu için backend API yine **`HTTP 400 Bad Request`** (`"BBox sınırları geçersiz veya izin verilen maksimum alan (0.5 derece) aşıldı."`) dönmektedir.
  2. Harita arayüzünde kırmızı hata bandı (`[GET] "http://localhost:3001/api/v1/stations?bbox=...": 400 Bad Request`) belirip harita kilitlenmektedir.
  3. Veritabanına 16.788 EPDK kaydı tohumlanmamıştır (`npm run db:seed` komutu ve `istasyonlar.json` yoktur); bellekte Türkiye geneli için sadece 4 adet mock istasyon (İstanbul için 3 adet) bulunmaktadır. 500+ istasyon pinine ulaşılması teknik olarak imkânsızdır.
- **Durum:** **BAŞARISIZ (FAIL)**.

### Adım 4: Pin Tıklama, İstasyon Detay Paneli, Soket/Güç/Operatör ve Derin Bağlantı Denetimi
- **İcra:** Genel aramada pin düşmediği için, API sınırını aşmayan yapay bir mikro-koordinat (`bbox=29.01,40.98,29.03,40.99`) üzerinden tekil mock pin (`ZES Kadıköy Moda Otoparkı`) zorlanarak incelendi.
- **Ölçüm:**
  - Pine tıklandığında sol detay paneli açılmakta; operatör adı ("ZES"), kanonik EPDK kodu ("ŞRJ/10423") ve adres doğru gelmektedir.
  - Eksik veri modeli doğrulanmıştır: Soket, güç ve tarifede sahte mock veri gösterilmemekte; nötr gri "Operatör Verisi Bekleniyor" rozeti ve "+ Bilgi Ekle" CTA'sı render edilmektedir.
  - "Operatörde Aç" tıklandığında masaüstü pano kopyalama mekanizması (`navigator.clipboard`) tetiklenmekte; `ŞRJ/10423` kodu panoya alınıp toast uyarısı verilmektedir.
  - **Kritik Test Sahteciliği Tespiti:** Geliştiricinin yazdığı `tests/uat_journey.spec.ts` dosyasının, repoda hiç var olmayan `../../backend/src/data/cpo_stations.json` dosyasını import ettiği ve çalıştırıldığında derleme hatasıyla patladığı tespit edilmiştir. Geliştirici ve QA testlerinin izole mock verilerle gerçeği yansıtmadığı kanıtlanmıştır.
- **Durum:** **BLOKE / ŞARTLI GEÇTİ (BLOCKED / CONDITIONAL PASS)**.

### Adım 5: Konsol ve Ağ Hata Denetimi (0 TypeError / 0 400 Bad Request Kuralı)
- **Kabul Eşiği:** Tarayıcı konsolunda hiçbir `TypeError: Cannot read properties of undefined` ve ağda hiçbir `400 Bad Request` hatası bulunmamalıdır. Hata tespitinde görev derhal REDDEDİLİR.
- **Ölçüm:**
  1. **Ağ Hatası (Kritik):** Canlı harita oturumunda `http://localhost:3001/api/v1/stations?bbox=25.82845,37.39904,39.89095,42.37728&zoom=6` isteğinde doğrudan **`HTTP 400 Bad Request`** yakalanmıştır.
  2. **Konsol Hata Kaydı:** `Failed to load resource: the server responded with a status of 400 (Bad Request)`.
- **Durum:** **BAŞARISIZ (FAIL - GÖREV REDDİ GEREKÇESİ)**.

---

## 3. Standart UAT Kabul Tablosu (Acceptance Test Matrix)

| Test Kodu | Kullanıcı Yolculuğu / Kabul Kriteri | Beklenen Sistem Davranışı | Canlı Ölçülen Sonuç (localhost:3000 & 3001) | UAT Kararı |
|---|---|---|---|:---:|
| **UAT-01** | Ülke Geneli Harita Açılışı & Kümeleme | Zoom < 10 seviyesinde ülke genelinde kümeleme daireleri (`count > 0`) görünmeli | Küme sayısı = 0. Zoom 6 BBox isteği 0.5 derece tavanına takılıp 400 Bad Request aldı. | **RED (FAIL)** |
| **UAT-02** | Büyükşehir Viewport Odaklanması | İstanbul'a odaklanıldığında (Zoom 11-12) 500+ istasyon pini haritaya düşmeli | Pin sayısı = 0. BBox isteği 400 Bad Request aldı; repoda 16.788 veri yerine 4 mock kayıt var. | **RED (FAIL)** |
| **UAT-03** | İstasyon Detay Paneli & Eksik Veri | Pine tıklandığında panel açılmalı; eksik verilerde "Operatör Verisi Bekleniyor" görünmeli | Panel açıldı, veri yokluk rozetleri doğru render edildi; ancak yalnızca mikro BBox'ta test edilebildi. | **ŞARTLI GEÇTİ** |
| **UAT-04** | CPO Derin Bağlantı & Pano Fallback | "Operatörde Aç" tıklandığında masaüstünde EPDK kodu panoya kopyalanmalı, toast çıkmalı | `ŞRJ/10423` panoya kopyalandı, toast bildirimi gösterildi ve operatör web sitesi tetiklendi. | **GEÇTİ (PASS)** |
| **UAT-05** | Ağ Trafiği Hata Denetimi | Canlı harita hareketinde 0 adet `400 Bad Request` oluşmalı | Ülke ve il BBox isteklerinde tekrarlayan `400 Bad Request` yanıtları yakalandı. | **RED (FAIL)** |
| **UAT-06** | Konsol Çalışma Zamanı Denetimi | Tarayıcı konsolunda 0 adet `TypeError: Cannot read properties of undefined` olmalı | TypeError oluşmadı (0 adet). | **GEÇTİ (PASS)** |
| **UAT-07** | Tohumlama (Seed) Bütünlüğü | `npm run db:seed` ile 16.788 EPDK istasyonunun veritabanına yüklenmiş olması | Veritabanında istasyon tablosu boş; seed komutu ve `istasyonlar.json` dosyası mevcut değil. | **RED (FAIL)** |
| **UAT-08** | Geliştirici UAT Paket Güvenilirliği | Geliştirici UAT testlerinin hatasız çalışması ve mock dosyaya bağımlı olmaması | `uat_journey.spec.ts` var olmayan `cpo_stations.json` dosyasını import ettiği için derleme hatasıyla çöktü. | **RED (FAIL)** |

---

## 4. Hata Raporları (Bug Reports) ve Görevi Reddetme Gerekçeleri

Aşağıdaki kritik (P0/P1) hatalar nedeniyle kullanıcı kabulü verilemez; görev derhal reddedilmiştir:

### [BUG-UAT-01] BBox 0.5 Derece Keyfi Tavanı ve Yaygın 400 Bad Request Hatası (Kritik - P0)
- **Konum:** `workspace/src/backend/src/utils/geo.ts:18` ve `station.service.ts:227`
- **Etki:** Kullanıcı haritayı açtığında veya bir şehri incelemek için uzaklaştırdığında (`lonDiff > 0.5` veya `latDiff > 0.5`), Fastify API `400 Bad Request` dönmektedir.
- **Hata Yanıtı:**
  ```json
  {
    "type": "https://api.elektriklioto.com/errors/bad-request",
    "title": "Geçersiz İstek",
    "status": 400,
    "detail": "BBox sınırları geçersiz veya izin verilen maksimum alan (0.5 derece) aşıldı.",
    "instance": "/api/v1/stations?bbox=25.82845,37.39904,39.89095,42.37728&zoom=6",
    "code": "BAD_REQUEST"
  }
  ```
- **Düzeltme Şartı:** 0.5 derece engeli derhal kaldırılmalı; geniş alanlarda istemciyi kilitlemek yerine zoom seviyesine göre PostGIS `ST_SnapToGrid` kümeleme sorgusu çalıştırılmalıdır.

### [BUG-UAT-02] Sunucu Tarafı Kümeleme (Clustering) API Eksikliği (Kritik - P0)
- **Konum:** `workspace/src/backend/src/modules/stations/station.routes.ts` ve `station.schema.ts`
- **Etki:** `zoom < 11` olduğunda harita bileşeni `{ type: 'clusters', data: [...] }` beklemektedir; ancak backend rotası yalnızca `Type.Array(StationSummarySchema)` dönmekte, küme verisi üretmemektedir. Haritada hiçbir küme dairesi render edilememektedir.
- **Düzeltme Şartı:** `station.routes.ts` şeması çift modlu (`stations` veya `clusters`) yanıt dönecek şekilde güncellenmeli ve veritabanı spatial kümeleme servisi entegre edilmelidir.

### [BUG-UAT-03] Veritabanı Tohumlama Hattı ve Gerçek Veri Yokluğu (Kritik - P0)
- **Konum:** `workspace/src/backend/`
- **Etki:** EPDK 16.788 istasyon ve 179 marka tohum verisi (`istasyonlar.json`) veritabanına aktarılmamıştır. Sistem 4 adet statik mock istasyon ile çalışmaktadır. İstanbul'da beklenen 500+ istasyon pininin haritaya düşmesi imkânsızdır.
- **Düzeltme Şartı:** `npm run db:seed` idempotent tohumlama betiği yazılmalı, PostGIS tablosuna 16.788 istasyon yüklenmeli ve spatial `GIST` indeksi doğrulanmalıdır.

### [BUG-UAT-04] Geliştirici UAT Test Dosyasında Sahte Veri Bağımlılığı (Yüksek - P1)
- **Konum:** `workspace/src/frontend/tests/uat_journey.spec.ts:2`
- **Etki:** Test dosyası repoda bulunmayan `../../backend/src/data/cpo_stations.json` dosyasını import etmekte, çalıştırıldığında derleme hatası verip çökmektedir. Geliştirici testlerinin izole mock varsayımlarla yazıldığı ve canlı sistemi doğrulamadığı kanıtlanmıştır.
- **Düzeltme Şartı:** Test dosyası var olmayan mock bağımlılığından arındırılmalı, doğrudan canlı HTTP API uç noktalarını sorgulayacak şekilde güncellenmelidir.

---

## 5. Nihai UAT Kararı ve Aşağı Akış Talimatı

- **Karar:** **GÖREV REDDİ (VERDICT: REJECTED)**.
- **Gerekçe:** Test Adımı 5'te yer alan bağlayıcı kural uyarınca; canlı harita etkileşimlerinde ağda yakalanan **`400 Bad Request`** hataları, kümeleme dairelerinin sıfır olması (Adım 2 ihlali) ve İstanbul'da 500+ istasyon pini yerine 0 pin düşmesi (Adım 3 ihlali) nedeniyle sistem kullanıcı kabul eşiğini geçememiştir.
- **Sonuç:** `BUG-UAT-01`, `BUG-UAT-02` ve `BUG-UAT-03` numaralı P0 kök nedenler backend geliştirici rolü tarafından giderilmeden ve 16.788 kayıt veritabanına tohumlanmadan sistem bir sonraki aşamaya geçirilemez.
