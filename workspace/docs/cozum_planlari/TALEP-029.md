# Studio Yetkilisi Çözüm Planı: TALEP-029

> **Talep:** [TALEP-029] Tüm Operatörler Menüsü Dış Alana Tıklandığında Kapanmıyor  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-26 23:37  
> **Öncelik:** NORMAL | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `web_engineer` (Kıdemli Web Frontend Mühendisi (Nuxt 3 & Vue))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Kullanıcı arayüzdeki 'Tüm Operatörler' açılır menüsünü açtıktan sonra herhangi bir operatör seçmeden sayfanın boş bir alanına tıkladığında menünün kapanmadığını ve açık kalmaya devam ettiğini belirtmiştir. Beklenen davranış, menü dışındaki herhangi bir boş alana tıklandığında açılır listenin kendiliğinden kapanmasıdır.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Nuxt 3 Web Frontend & Harita Arayüzü

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

1. **Kök Neden:** Açılır menü muhtemelen sadece bir toggle butonuna `onClick`/`onToggle` ile bağlanmış; dışarı tıklamayı yakalayan bir "outside click" dinleyicisi (document/window seviyesinde `mousedown`/`click` listener + menü ref kontrolü, ya da native `<dialog>`/`popover` API'sinin sağladığı light-dismiss davranışı) hiç implemente edilmemiş veya event listener component unmount/re-render sırasında düzgün bağlanmamış.

2. **Kritik Riskler:** Outside-click çözümü eklenirken (a) event propagation'a dikkat edilmeli — menüyü açan butona tıklamanın hem "aç" hem "dışarı tıklama ile kapat" mantığını birbirine karıştırıp anında kapanmasına yol açmaması gerekir; (b) listener `capture`/`bubble` fazında doğru bağlanmalı ve component unmount olduğunda mutlaka temizlenmeli (memory leak); (c) klavye ile erişilebilirlik için Escape tuşu ve focus-trap davranışı da aynı anda gözden geçirilmeli; (d) menü içindeki bir öğeye tıklayıp scroll/drag gibi hareketlerin yanlışlıkla "dışarı tıklama" sayılmaması test edilmeli.

**İlgili Dosyalar & Modüller:**
   - `workspace/src/frontend/components/`
   - `workspace/src/frontend/pages/`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`web_engineer`)
- İlgili Vue bileşenindeki mevcut state, props ve event akışını kontrol et.
- Sorunun lokal ortamda (`./yerel_ortam.sh` → 3000) yeniden üretilebilirliğini teyit et.

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
