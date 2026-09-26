# Studio Yetkilisi Çözüm Planı: TALEP-032

> **Talep:** [TALEP-032] Tüm Operatörler Menüsü Dış Alana Tıklandığında Kapanmıyor  
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

**1. Kök Neden:** Açılır menü muhtemelen sadece kendi tetikleyici butonuna bir click/toggle event listener bağlıyor; dokümana (document/window) global bir "dışarı tıklama" (outside click) dinleyicisi eklenmemiş, bu yüzden menü dışına yapılan tıklamalar hiçbir şekilde yakalanıp menüyü kapatan state/CSS değişikliğini tetiklemiyor. Alternatif olarak dinleyici eklenmiş olsa bile `event.stopPropagation()` menü içeriğinde kullanılıyor olabilir ve bu da olayın document seviyesine ulaşmasını engelliyor olabilir.

**2. Kritik Riskler:** Düzeltirken (a) event listener'ın menü açıldığında eklenip kapandığında mutlaka kaldırıldığından emin olun, aksi halde memory leak veya çoklu listener birikimi oluşur; (b) tıklama tespiti için event target'ın menü elemanının içinde olup olmadığını (ref/contains kontrolü) doğru yapın, yoksa menü butonuna tekrar tıklayınca hem açma hem kapama tetiklenip "flicker" oluşabilir; (c) mobilde touch event'leri ve klavye ile (Escape tuşu, Tab ile focus kaybı) kapatma senaryolarını da kapsayın; (d) diğer açılır menülerde (varsa) benzer kalıp kullanılıyorsa aynı hata tekrarlanıyor olabilir, ortak bir çözüm (custom hook/component) düşünülmeli.

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
