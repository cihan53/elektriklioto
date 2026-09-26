# Studio Yetkilisi Çözüm Planı: TALEP-024

> **Talep:** [TALEP-024] Operatör Menüsünde Arama ve 'Tüm Markalar' Alanının Sabitlenmesi ve İstasyon Sayılarının Gösterilmesi  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-26 10:30  
> **Öncelik:** NORMAL | **Tür:** UX  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `web_engineer` (Kıdemli Web Frontend Mühendisi (Nuxt 3 & Vue))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Harita üzerindeki 'Tüm Operatörler' menüsünü açıp markalar arasında gezinmek istediğimde, liste aşağı kaydırıldıkça arama çubuğu ve 'Tüm Markalar' seçeneği kayboluyor. Listeyi aşağı kaydırsam bile en üstteki arama kutusunun ve 'Tüm Markalar' seçeneğinin menünün tepesinde sabit (yapışkan) kalmasını istiyorum; böylece listeyi tekrar başa kaydırmak zorunda kalmadan her an arama yapabilir veya filtreyi sıfırlayabilirim. Ayrıca her bir markanın yanında kaç adet istasyonu olduğunun parantez veya rozet içinde yazması, operatörlerin yaygınlığını tek bakışta görüp seçim yapmamı çok kolaylaştıracaktır.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Nuxt 3 Web Frontend & Harita Arayüzü

---

## 2. Kök Neden & Mimari Analiz

**Devin Analizi:**

İlgili bileşeni hızlıca inceleyeyim.

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
