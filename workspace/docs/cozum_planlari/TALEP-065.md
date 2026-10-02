# Studio Yetkilisi Çözüm Planı: TALEP-065

> **Talep:** [TALEP-065] Tüm sistem bileşenlerinin (arama, filtreler, operatörler) merkezi veritabanından dinamik beslenmesi  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-10-02 11:59  
> **Öncelik:** YUKSEK | **Tür:** ISTEK  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `backend_engineer` (Backend & API Mühendisi (Fastify & PostGIS))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Harita üzerindeki istasyonların, arama çubuğu havuzunun, operatör filtre listelerinin ve istasyon detayındaki uygulama açma yönlendirmelerinin statik/hafıza içi (in-memory/file) bağımlılıklardan arındırılarak doğrudan merkezi veritabanından (single source of truth) dinamik olarak beslenmesi; veritabanı güncellemelerinin tüm sistemde anında ve tutarlı şekilde yansıması talep edilmektedir.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Backend API & Servis Katmanı

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

**1. Kök Neden:**
Sistemin farklı bileşenleri (harita, arama, operatör filtreleri, yönlendirme linkleri) muhtemelen her biri kendi statik/in-memory veri kaynağından (seed dosyaları, config sabitleri, cache edilmiş liste) besleniyor; veritabanı tek "source of truth" olarak tasarlanmamış, bunun yerine her modül kendi kopyasını tutuyor. Bu, veri senkronizasyon katmanının (merkezi bir repository/service layer) eksikliğinden kaynaklanıyor — her ekip/özellik kendi veri erişim yolunu açmış.

**2. Kritik Riskler:**
- Tüm bileşenleri aynı anda tek bir veri katmanına bağlarken geriye dönük uyumluluk kırılabilir; kademeli geçiş (feature flag ile değil, modül modül) ve regresyon testleri şart.
- Operatör/istasyon sorgularının DB'ye taşınması performans riski taşır (N+1 sorgular, index eksikliği) — mevcut in-memory erişim hızına yakın kalması için caching/indexleme stratejisi baştan planlanmalı.
- "Anında yansıma" talebi, cache invalidation veya realtime (websocket/polling) mekanizması gerektirir; bu olmadan "dinamik" sadece yarım kalır.
- Harita, arama ve filtre bileşenlerinin veri şemaları birbirinden farklıysa (örn. operatör isimlendirmesi tutarsızlığı — bkz. TALEP-054 mükerrer kayıt sorunu), merkezi kaynağa geçiş mevcut veri kalitesi sorunlarını yüzeye çıkarabilir; migrasyon öncesi veri temizliği gerekir.

**İlgili Dosyalar & Modüller:**
   - `workspace/src/backend/src/modules/`
   - `workspace/src/backend/src/app.ts`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`backend_engineer`)
- İlgili Fastify modülündeki rota tanımı ve handler mantığını incele.
- Sorunun lokal ortamda (`./canli.sh` → 3001) yeniden üretilebilirliğini teyit et.

### Aşama B: Kodlama ve Çözüm
- İlgili route veya servis katmanında gerekli düzeltmeyi yap.
- Tip uyuşmazlığı, null/undefined kontrolleri ve async hataları kontrol et.
- Swagger/OpenAPI belgesi gerekiyorsa güncelle.

### Aşama C: Test ve Doğrulama (`uat_auditor` / `qa_lead`)
- API endpoint'ini `curl` veya Swagger UI üzerinden manuel test et.
- Tarayıcı konsolunda 0 hata olduğunu doğrula.

---

## 4. Kabul Kriterleri (Definition of Done)

- [ ] İlgili API endpoint'i beklenen yanıtı döndürüyor.
- [ ] Tarayıcı konsolunda TypeError veya Uncaught hatası bulunmuyor.
- [ ] Mevcut çalışan rotalar bozulmamış.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
