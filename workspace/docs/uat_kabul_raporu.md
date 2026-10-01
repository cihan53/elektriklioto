# Kullanıcı Kabul Testi (UAT) ve Saha Doğrulama Raporu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Rol:** UAT Auditor (Kullanıcı Kabul Test Uzmanı)  
> **Test Ortamı:** Canlı Yerel Ortam (`localhost:3000` Nuxt Web, `localhost:3001` Fastify API, `localhost:5432` PostGIS)  
> **Nihai Karar:** **GÖREV REDDEDİLDİ (REJECTED — HATA BULUNDU)**  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/kabul_kriterleri.md`, `workspace/docs/ux_akislari.md`, `workspace/docs/test_raporu.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca in-memory işlenir, geçmiş koordinat tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtında ortam raporundaki "Exec format error" çatışması yerel ortamda giderilmiş durumdadır; ancak mobil UAT testleri fiziksel cihaz/cihaz emülatörü temin edilene kadar web ve API sözleşme yüzeyi üzerinden icra edilmektedir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` bulunmadığından canlı süreçler `npm 10.9.4` ile doğrulanmıştır.

> **Varsayım:** Canlı UAT testleri, geliştirici birim testlerinden ve izole mock dosyalardan bağımsız olarak, doğrudan `http://localhost:3000` (Nuxt Nitro SSR) ve `http://localhost:3001` (Fastify API) çalışan süreçleri üzerinde uçtan uca ağ ve etkileşim çağrılarıyla yürütülmüştür.

> **Varsayım:** Veritabanında henüz tam 16.788 EPDK kaydının tohumlanmadığı (tohumlama betiği eksikliği) durumlarda, mevcut canlı seed kayıtları üzerinden BBox, kümeleme ve istasyon detay uç noktalarının canlı davranışları test edilmiştir.

---

## 2. UAT Yönetici Özeti ve Nihai Karar

UAT icra protokolü 5. kuralı gereğince: **"Tarayıcı konsolunda 'TypeError: Cannot read properties of undefined' veya ağda '400 Bad Request' yakalarsa derhal HATA (BUG) raporu üretir ve görevi REDDEDER."**

Canlı sistem üzerinde yapılan kullanıcı kabul testlerinde:
1. **Ağda 400 Bad Request Hatası Tespit Edildi:** Kullanıcı haritayı Türkiye geneline veya büyükşehir geniş ekran görünümüne (İstanbul geneli, `lonDiff > 0.5`) kaydırdığında backend `geo.ts` içindeki keyfi 0.5 derece engeli nedeniyle ağda `400 Bad Request` yanıtı üretmekte, harita bileşeni kilitlenmektedir.
2. **Kümeleme (Clustering) Daireleri Sunulamıyor:** Düşük zoom seviyelerinde (`zoom < 11`) PostGIS `ST_SnapToGrid` tabanlı `type: clusters` verisi dönmesi gerekirken tekil istasyonlar dönmekte ve geniş viewport'ta 400 hatası nedeniyle kümeleme daireleri ekrana düşmemektedir (sayı = 0).
3. **Delta Uç Noktası 404 Veriyor:** Canlı harita senkronizasyonu için çağrılan `GET /api/v1/stations/delta` rotası `:slug` yakalayıcısına düşerek `404 Not Found` hatası üretmektedir.

**NİHAİ UAT KARARI:** **REDDEDİLDİ (REJECTED)**  
Sistem bu kritik kusurlarla canlı üretime veya kullanıcı kabul onayına geçemez.

---

## 3. Canlı UAT Senaryoları ve Doğrulama Matrisi

| Test ID | Kullanıcı Yolculuğu / Test Adımı | Beklenen Sonuç | Canlı Sistem Sonucu | Durum | Hata / Log Referansı |
|---|---|---|---|:---:|---|
| **UAT-01** | Canlı web haritasına bağlanma (`http://localhost:3000/`) | Nuxt SSR 200 OK ile açılmalı, `<ClientOnly>` harita hydrate olmalı | Web arayüzü 200 OK ile açıldı; header ve harita konteyneri başarıyla yüklendi | **GEÇTİ** | HTTP 200 (FCP < 1.0s) |
| **UAT-02** | Türkiye geneli kümeleme (clustering) kontrolü (`zoom: 6-9`) | Sayı > 0 olan kümeleme daireleri görünmeli (`cluster_count`) | API `lonDiff > 0.5` gerekçesiyle **400 Bad Request** döndü; küme daireleri çizilemedi (Sayı: 0) | **KALDI** | **BUG-UAT-01** / **BUG-UAT-02** (`HTTP 400`) |
| **UAT-03** | Büyükşehir kümesine tıklama (İstanbul `zoom: 11-12`) | Harita hedefe uçmalı, viewport'a 500+ istasyon pini düşmeli | İstanbul genelini kapsayan BBox (`28.5,40.8,29.5,41.2`) çağrısında **400 Bad Request** oluştu | **KALDI** | **BUG-UAT-01** (`HTTP 400 Bad Request`) |
| **UAT-04** | Daraltılmış BBox'ta pin seçimi (`zoom: 14`) | Seçilen pin odaklanmalı (%15 büyüme), sol detay paneli açılmalı | Dar BBox (`29.01,40.98,29.03,40.99`) ile pinler yüklendi; pine tıklandığında detay paneli açıldı | **GEÇTİ** | Detay paneli reaktif açıldı |
| **UAT-05** | İstasyon detay panelinde eksik veri kontrolü (Nullable DTO) | Soket tipi, güç, tarife `null` olmalı; "Operatör Verisi Bekleniyor" rozeti basılmalı | `power_kw: null`, `tariffs: null` geldi; arayüzde nötr gri "Operatör Verisi Bekleniyor" rozeti render edildi | **GEÇTİ** | PO-301 sözleşme uyumu tam |
| **UAT-06** | "Operatörde Aç / Derin Bağlantı" ve Pano (Clipboard) Eylemi | CPO uygulaması yönlendirmesi veya panoya istasyon no (`ŞRJ/xxxx`) kopyalama + toast | Butona basıldığında istasyon kodu panoya kopyalandı; 4 sn toast bildirimi gösterildi | **GEÇTİ** | PO-401 Clipboard Fallback başarılı |
| **UAT-07** | Harita delta güncellemesi (`GET /api/v1/stations/delta?since=...`) | Son güncellenen istasyon listesi veya 304 Not Modified dönmeli | Endpoint bulunamadı; API `:slug` olarak algılayıp **404 Not Found** döndü | **KALDI** | **BUG-UAT-03** (`HTTP 404 Not Found`) |
| **UAT-08** | Proximity Proof arıza bildirimi ve sıfır konum saklama | 50m dışındayken form kilitlenmeli; 50m içindeyken HMAC kanıtı gönderilmeli; ham GPS saklanmamalı | İstemci lokal mesafeyi hesapladı, 50m dışında formu kilitledi; ham GPS API'ye iletilmedi | **GEÇTİ** | KVKK Sıfır-Konum kuralı korundu |
| **UAT-09** | Masaüstünden mobil uygulamaya rota aktarımı (QR Köprüsü) | "Telefona Aktar" ile 256x256 dinamik SVG QR kod ve Base64 URL üretilmeli | QR Bridge modalı açıldı; Base64 URL ve SVG QR kod hatasız render edildi | **GEÇTİ** | PO-801 QR Köprüsü doğrulandı |
| **UAT-10** | Ağ ve konsol hata denetimi (Console & Network Audit) | Konsolda TypeError / Ağda 400 Bad Request olmamalı | Geniş harita kaydırmalarında ağ sekmesinde **400 Bad Request** yakalandı | **KALDI** | **BUG-UAT-01** (UAT Red Kriteri) |

---

## 4. Tespit Edilen Kritik Hatalar (BUG Raporları)

### BUG-UAT-01: Geniş Viewport Harita Aramasında Ağda 400 Bad Request Hatası
- **Şiddet / Öncelik:** **KRİTİK / ENGELLEYİCİ (BLOCKED)**
- **İlgili Kural:** UAT Adım 5 ("Ağda 400 Bad Request yakalarsa derhal görevi reddeder") & PO-201
- **Hata Tanımı:** Masaüstü tarayıcısında kullanıcı haritayı açtığında veya haritayı uzaklaştırdığında (zoom-out), BBox sınırları 0.5 dereceyi aştığı anda backend isteği reddetmektedir.
- **Canlı Ağ Kanıtı:**
  ```http
  GET /api/v1/stations?bbox=28.5,40.8,29.5,41.2&zoom=9 HTTP/1.1
  Host: localhost:3001

  HTTP/1.1 400 Bad Request
  Content-Type: application/json; charset=utf-8
  {
    "statusCode": 400,
    "error": "Bad Request",
    "message": "BBox sınırları geçersiz veya izin verilen maksimum alan (0.5 derece) aşıldı."
  }
  ```
- **Kök Neden:** `workspace/src/backend/src/utils/geo.ts` dosyasında geliştirici tarafından konulmuş keyfi tavan:
  ```typescript
  if (lonDiff > 0.5 || latDiff > 0.5) return false;
  ```
- **Kullanıcı Etkisi:** Kullanıcı Türkiye genelini veya İstanbul'un iki yakasını aynı anda görmek istediğinde harita boş kalmakta, harita kilitlenmekte ve ağda 400 hatası patlamaktadır.
- **Düzeltme Kararı:** `lonDiff > 0.5` kısıtı derhal kaldırılmalı; geniş alanlarda backend PostGIS `ST_SnapToGrid` ile kümeleme moduna geçmelidir.

---

### BUG-UAT-02: Düşük Zoom Seviyelerinde Kümeleme (Clustering) API Eksikliği
- **Şiddet / Öncelik:** **YÜKSEK**
- **İlgili Kural:** UAT Adım 2 ("Türkiye genelindeki kümeleme dairelerini kontrol eder; sayı > 0 olmalı") & PO-201
- **Hata Tanımı:** Kullanıcı Türkiye haritasına ilk girdiğinde (`zoom < 11`), haritada küme dairelerinin (`type: "clusters"`, `cluster_count`) görünmesi zorunludur. Ancak canlı API `zoom=8` çağrısında küme nesnesi yerine tekil istasyon dizisi dönmekte veya BUG-UAT-01 nedeniyle 400 hatasına düşmektedir.
- **Canlı Sistem Yanıtı:**
  Frontend kodunda (`B4DKSn9Q.js`):
  ```javascript
  k && k.type === "clusters" ? (a.value = "clusters", n.value = k.data || []) : ...
  ```
  beklenmesine karşın backend hiçbir zaman `{ type: "clusters", data: [...] }` yapısını dönmemektedir.
- **Kullanıcı Etkisi:** Türkiye genelinde şarj yoğunluğu daireleri görülememekte, kullanıcı hangi şehirde kaç istasyon olduğunu anlayamamaktadır.

---

### BUG-UAT-03: Canlı Delta Senkronizasyon Uç Noktası Eksikliği (404 Not Found)
- **Şiddet / Öncelik:** **YÜKSEK**
- **İlgili Kural:** PO-202 (Zaman Damgalı Değişiklik Senkronizasyonu)
- **Hata Tanımı:** Canlı haritada istasyon durumu veya arıza güncellemesi çekmek için çağrılan `GET /api/v1/stations/delta?since={epoch}` isteği, backend router'da tanımlı olmadığı için `:slug` parametresine yönlenmekte ve 404 üretmektedir.
- **Canlı Ağ Kanıtı:**
  ```http
  GET /api/v1/stations/delta?since=1726700000 HTTP/1.1
  Host: localhost:3001

  HTTP/1.1 404 Not Found
  {
    "statusCode": 404,
    "error": "Not Found",
    "message": "İstasyon bulunamadı: delta"
  }
  ```
- **Kullanıcı Etkisi:** Harita açıkken sahada arızalanan veya güncellenen istasyonlar arka planda sessizce eşitlenememekte, istemci gereksiz tam sorgu atmak zorunda kalmaktadır.

---

## 5. Doğrulanan Başarılı Kullanıcı Yolculukları

Kritik BBox ve kümeleme engellerine rağmen, dar alanda başarıyla doğrulanan akışlar şunlardır:

1. **Eksik Veri Görsel Dili (DoD Kapısı 5):**
   `kadikoy-moda-zes-1` istasyonu detay kartında açıldığında; soket, güç ve tarife alanları için sahte veri (mock) üretilmediği, `null` değerlerin "Operatör Verisi Bekleniyor" nötr rozetiyle karşılandığı ve yanındaki "Bilgi Ekle" CTA'sının topluluk katkı modalını başarıyla açtığı teyit edildi.
2. **Clipboard Fallback ve Derin Bağlantı (PO-401):**
   Masaüstü web ortamında "Operatörde Aç" tıklandığında, sistem panosuna `ŞRJ/1904` resmi EPDK numarasının kopyalandığı ve kullanıcıya net bir yönlendirme toast'ı gösterildiği doğrulandı.
3. **Sıfır Konum Saklama İlkesi (KVKK):**
   Arıza bildirimi modalı üzerinden gönderilen ağ paketleri incelendiğinde; istek gövdesinde enlem, boylam, koordinat veya kullanıcı IP bilgisinin bulunmadığı, yalnızca HMAC-SHA256 imzalı `proximity_proof` ve `nonce` iletildiği doğrulandı.
4. **Web-to-Mobile Rota Aktarımı (PO-801):**
   "Telefona Aktar" aksiyonu ile üretilen QR kodun geçerli bir Base64 kısa URL (`/r/...`) barındırdığı ve SVG çıktısının 256x256 boyutlarında render edildiği görüldü.

---

## 6. UAT Reddetme Gerekçesi ve Zorunlu Aksiyon Planı

UAT değerlendirmesi sonucunda sistem **REDDEDİLMİŞTİR**. Sistemin kullanıcı kabul onayını alabilmesi için aşağıdaki geliştirme maddelerinin acilen tamamlanması şarttır:

1. **`lonDiff > 0.5` Kısıtının Kaldırılması (ACİL):**
   `workspace/src/backend/src/utils/geo.ts` dosyasındaki alan genişlik kontrolü silinmeli; Türkiye genelini kapsayan BBox sorgularına izin verilmelidir.
2. **PostGIS `ST_SnapToGrid` Kümeleme Motorunun Eklenmesi:**
   `zoom < 11` olduğunda backend tekil istasyonlar yerine `{ type: "clusters", data: [{ cluster_id, count, center_lat, center_lon }] }` formatında küme dairelerini dönmelidir.
3. **`GET /api/v1/stations/delta` Rotasının Tanımlanması:**
   `station.routes.ts` içinde `:slug` yakalayıcısından önce `delta` rotası tanımlanmalı ve zaman damgasına göre güncellenen kayıtları dönmelidir.
4. **16.788 Kayıtlı EPDK Tohumlamasının Yapılması:**
   Haritada 500+ istasyon yoğunluğunun doğrulanabilmesi için `npm run db:seed` hattı tamamlanmalı ve PostGIS spatial indeksleri üzerinden tam yük testi icra edilmelidir.

Bu 4 madde giderilip ağda `400 Bad Request` ve `404 Not Found` hataları sıfırlandığında UAT süreci yeniden işletilecektir.
