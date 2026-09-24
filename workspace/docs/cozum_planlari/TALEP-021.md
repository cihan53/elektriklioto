# Studio Yetkilisi Çözüm Planı: TALEP-021

> **Talep:** [TALEP-021] Pano görevlerine öncelik alanı eklenmeli  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-24 18:58  
> **Öncelik:** NORMAL | **Tür:** ISTEK  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `web_engineer` (Kıdemli Web Frontend Mühendisi (Nuxt 3 & Vue))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Sprint panosundaki görevler arasından sıradakini seçerken öncelik dikkate alınmıyor; işler yalnızca sprint sırasına göre ilerliyor. Önemli bir işi öne çekmek için elle sıra değiştirmek gerekiyor. Görevlere bir öncelik alanı eklenip (ör. müşteri talebinin önceliğinden türetilerek) sıradaki görevin önceliğe göre seçilmesi isteniyor.

- **Etkilenen Ekran / URL:** `studio`
- **Hedef Bileşen Grubu:** Nuxt 3 Web Frontend & Harita Arayüzü

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

**1. Kök Neden:**
Pano veri modelinde görev (task) nesnesinin sadece sıra/pozisyon (sprint order) bilgisi tutuluyor, ayrı bir `priority` alanı yok; "sıradaki görev" seçimi de muhtemelen listedeki index/order'a göre yapılan basit bir sıralama mantığıyla çalışıyor. Bu yüzden önceliklendirme, kullanıcının elle taşıma (drag/reorder) yapmasına bağlı — sistemin kendisinde önceliği temsil eden ve seçim algoritmasına giren bir alan bulunmuyor.

**2. Kritik Riskler:**
- Önceliğin nereden türeyeceği net tanımlanmalı: müşteri talebinin önceliğiyle otomatik senkron mu olacak, yoksa manuel override edilebilecek mi? İkisi çakışırsa hangisi kazanır belirlenmeli.
- Mevcut `pano.json` ve `musteri_talepleri.json` şemalarında geriye dönük veri migrasyonu gerekecek; önceliği olmayan eski görevler için default değer (örn. "orta") atanmalı.
- "Sıradaki görevi seç" mantığı değişince (order → priority+order) mevcut sprint akışı ve varsa otomasyon/entegrasyonlar (ör. otomatik atama, bildirim tetikleyicileri) etkilenmemeli — bu iş mantığı test edilmeli.
- Aynı önceliğe sahip birden fazla görev olduğunda tie-breaker kuralı (yine sprint sırası mı, oluşturma tarihi mi) net olmalı, aksi halde davranış tutarsız/deterministik olmayan hale gelir.

**İlgili Dosyalar & Modüller:**
   - `workspace/src/frontend/components/`
   - `workspace/src/frontend/pages/`

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
