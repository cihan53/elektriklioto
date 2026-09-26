# Studio Yetkilisi Çözüm Planı: TALEP-030

> **Talep:** [TALEP-030] Tüm Operatörler Menüsü Dış Alana Tıklandığında Kapanmıyor  
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

1. **Kök Neden:** Açılır menü büyük olasılıkla bir `dropdown`/`select` bileşeni olarak sadece kendi tetikleyici butonu üzerinde `onClick`/`toggle` mantığıyla açılıp kapanıyor; dokümanın (document) genelinde "dışarı tıklama" (click-outside / blur) dinleyicisi tanımlanmamış, bu yüzden menü dışına yapılan tıklamalar hiçbir kapatma olayı tetiklemiyor ve state `open=true` olarak kalıyor.

2. **Kritik Riskler:** Çözüm için eklenecek `document`/`window` seviyesindeki click listener'ın event bubbling ile menünün kendi içindeki tıklamaları (örn. arama kutusu, scroll, operatör seçimi) yanlışlıkla kapatmaması gerekir — `ref` ile menü alanı hariç tutulmalı; ayrıca dinleyici component unmount olduğunda temizlenmeli (memory leak/çoklu listener birikimi riski), mobilde touch event'leriyle de test edilmeli, ve sayfada aynı anda başka açılır menüler varsa (ör. filtre menüleri) ortak bir "dışarı tıklama" hook'u kullanılarak tutarlılık sağlanmalı.

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
