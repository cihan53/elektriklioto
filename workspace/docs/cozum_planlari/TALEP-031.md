# Studio Yetkilisi Çözüm Planı: TALEP-031

> **Talep:** [TALEP-031] Tüm Operatörler Menüsü Dış Alana Tıklandığında Kapanmıyor  
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

**1. Kök Neden:** Dropdown/menü bileşeni açık durumdayken dış tıklamayı (outside click) dinleyen bir mekanizma yok — muhtemelen menü sadece kendi toggle butonuna bağlı state ile açılıp kapanıyor, `document`/`window` seviyesinde bir click listener veya blur/focus-out olayı eklenmemiş. Bu genelde custom dropdown'larda `useEffect` içinde `document.addEventListener('click', handler)` eklenmesinin unutulması ya da event'in `stopPropagation()` ile menü içinde durdurulup dışarıya hiç sızmaması sonucu oluşur.

**2. Kritik Riskler:**
- Event listener'ı eklerken aynı tıklamanın menüyü açan butona da denk gelip anında tekrar kapanıp açılmasını (toggle çakışması) engellemek gerekir — genelde `mousedown` + ref kontrolü ile çözülür.
- Listener'ın component unmount olduğunda `removeEventListener` ile temizlenmesi şart, aksi halde memory leak / diğer sayfalarda hayalet listener oluşur.
- ESC tuşu ile kapama ve menü içi tıklamalarda kapanmama davranışlarının bu düzeltmeyle bozulmadığından emin olunmalı (regresyon testi).
- Eğer proje genelinde birden fazla açılır menü (dropdown) varsa, çözüm tek bir yerde (ortak hook/component) yapılmalı; her menüde ayrı ayrı patch aynı hatayı başka menülerde tekrar üretir.

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
