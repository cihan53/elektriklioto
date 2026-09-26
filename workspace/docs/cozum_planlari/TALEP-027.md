# Studio Yetkilisi Çözüm Planı: TALEP-027

> **Talep:** [TALEP-027] Haritada Yakınlaşınca İstasyon Pinlerinin Yapay Bir Dikdörtgen Blok Halinde Üst Üste Yığılması  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-26 11:59  
> **Öncelik:** KRITIK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `web_engineer` (Kıdemli Web Frontend Mühendisi (Nuxt 3 & Vue))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Harita üzerinde bir şehre (örneğin Ankara'ya) yakınlaştığımda (zoom yaptığımda), şarj istasyonları gerçek cadde ve tesis konumlarına yayılmak yerine haritanın merkezinde yapay ve yoğun bir dikdörtgen blok şeklinde üst üste yığılıyor. Yüzlerce istasyon pini iç içe geçerek altındaki haritayı tamamen kapatıyor ve hangi istasyonun nerede olduğunu seçmeyi imkansız hale getiriyor. Bu durum sadece tek bir bölgede değil, farklı yerlerde yakınlaşma yapıldığında da benzer biçimde yaşanıyor. Bir elektrikli araç kullanıcısı olarak istasyonların bu şekilde tek bir kutuya sıkışmadan gerçek konumlarında doğru şekilde gösterilmesini bekliyorum.
> 
> 📌 **Müşteri Ek Notu (Ortam & Regresyon Bilgisi):**  
> Şu an canlı ortamda (`elektriklioto.com`) bu problem yaşanmıyor. Problem yalnızca **local test servisinde** görülüyor; yani son yapılan yerel güncellemeler veya mock/fallback veri/harita bileşeni değişiklikleri bu regresyona sebep olmuş olabilir. İncelemenin local branch diff'leri üzerinden yapılması önerilir.

- **Etkilenen Ekran / URL:** `/harita`
- **Hedef Bileşen Grubu:** Nuxt 3 Web Frontend & Harita Arayüzü

---

## 2. Kök Neden & Mimari Analiz

**Devin Analizi:**

Harita kodlarını inceleyip kök nedeni doğrulayacağım.

**İlgili Dosyalar & Modüller:**
   - `workspace/src/frontend/components/`
   - `workspace/src/frontend/pages/`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`web_engineer`)
- İlgili Vue bileşenindeki mevcut state, props ve event akışını kontrol et.
- Sorunun lokal ortamda (`./canli.sh` → 3000) yeniden üretilebilirliğini teyit et.

### Aşama B: Kodlama ve Çözüm
- İlgili bileşende gerekli refactor / hata düzeltmesini yap.
- Varsa tip uyuşmazlığı, null/undefined kontrolleri (`optional chaining`) ve reaktif değişkenleri koru.
- Sayfa yüklenirken veya aksiyon gerçekleşirken UI tepkisiz kalmamalı, gerekirse yükleniyor göstergesi ekle.

### Aşama C: Test ve Ziyaretçi Doğrulaması (`uat_auditor` / `qa_lead`)
- Değişiklik sonrası tarayıcı konsolunda hata (0 TypeError, 0 Uncaught) oluşmadığını doğrula.
- Kullanıcı senaryosunu baştan sona (tıklama, arama, filtreleme veya veri akışı) tekrar dene.

---

## 4. Kabul Kriterleri (Definition of Done)

- [ ] Müşterinin bildirdiği hata veya eksiklik tamamen ortadan kalktı.
- [ ] Tarayıcı konsolunda sıfır hata.
- [ ] Mevcut çalışan rotalar ve özellikler bozulmamış.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
