# Studio Yetkilisi Çözüm Planı: TALEP-066

> **Talep:** [TALEP-066] Arama motorları için dinamik sitemap.xml site haritası oluşturulması  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-10-02 12:14  
> **Öncelik:** NORMAL | **Tür:** ISTEK  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `ui_designer` (Arayüz ve Tasarım Uzmanı (UI/UX))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Platformun Google ve diğer arama motorları tarafından eksiksiz indekslenebilmesi amacıyla statik sayfalar ile dinamik istasyon ve operatör sayfalarını içeren, otomatik güncellenen sitemap.xml site haritasının oluşturulması ve robots.txt dosyasına bağlanması talep edilmektedir.

- **Etkilenen Ekran / URL:** `/sitemap.xml`
- **Hedef Bileşen Grubu:** Arayüz Tasarım Sistemi & Tailwind

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

**1. Kök Neden:**
Platformda SEO altyapısı hiç kurulmamış — statik sayfalar dışında istasyon ve operatör detay sayfaları arama motorlarına hiçbir şekilde keşfettirilmiyor, çünkü bu sayfalar dinamik route'larla (DB'den gelen slug/ID) oluşturuluyor ve derleme zamanında sabit bir sitemap'e yazılamıyor. `robots.txt` de bu eksik sitemap'e referans vermediği için arama motoru tarayıcıları dinamik içeriğe hiç ulaşamıyor; kök neden, "crawl edilebilirlik" ihtiyacının backend route yapısına hiç entegre edilmemiş olması.

**2. Kritik Riskler:**
Sitemap'in istasyon/operatör sayısı arttıkça (binlerce kayıt) tek dosyada şişmemesi için 50.000 URL sınırına göre sitemap index + parçalı dosya yapısı kurulmalı; her istveği DB'den canlı çekmek yerine cache'lenmeli (ör. periyodik job veya kısa TTL'li cache) ki trafik altında performans sorunu yaratmasın. Silinmiş/pasif istasyon-operatör kayıtlarının sitemap'te kalmaması (404/410 linkler Google'da güven kaybı yaratır) ve `lastmod` değerlerinin gerçek güncelleme zamanını yansıtması gerekir; ayrıca `robots.txt`'teki sitemap URL'sinin prod domain ile birebir, HTTPS ve doğru canonical formatla eşleşmesi sağlanmalı.

**İlgili Dosyalar & Modüller:**
   - `workspace/src/frontend/assets/`
   - `workspace/src/frontend/tailwind.config.js`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: Görsel İnceleme (`ui_designer`)
- İlgili bileşeni tarayıcıda incele, sorunu görsel olarak belgele.
- Tailwind config ve mevcut tasarım token'larını gözden geçir.

### Aşama B: Tasarım Uygulama
- İlgili Vue bileşeninde / CSS dosyasında gerekli stil düzeltmesini yap.
- Mobil ve masaüstü breakpoint'lerinde test et.

### Aşama C: Görsel Doğrulama (`uat_auditor`)
- Değişikliği farklı ekran boyutlarında (mobile / tablet / desktop) kontrol et.

---

## 4. Kabul Kriterleri (Definition of Done)

- [ ] Tasarım sorunu görsel olarak giderildi.
- [ ] Mobil ve masaüstünde düzgün görünüyor.
- [ ] Diğer bileşenler etkilenmemiş.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
