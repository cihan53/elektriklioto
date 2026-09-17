# Studio Yetkilisi Çözüm Planı: TALEP-008

> **Talep:** [TALEP-008] Harita pinleri ve kümeleme baloncuklarının modal pencerelerin (QrBridgeModal vb.) üzerine taşması (z-index katman çakışması)  
> **Müşteri / Bildiren:** elektriklioto.com Sahibi  
> **Bildirim Tarihi:** 2026-09-17 19:21  
> **Öncelik:** KRITIK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `web_engineer` (Kıdemli Web Frontend Mühendisi (Nuxt 3 & Vue))  

---

## 1. Müşteri Talebi ve Problem Tanımı
Müşteri (site sahibi) denetimi sırasında aşağıdaki durumu tespit etti:
> **Açıklama:**  
> Karekod (QrBridgeModal), Arıza Bildirimi veya Katkı Sağla modalı açıldığında, MapLibre harita üzerindeki pinler ve kümeleme baloncukları (marker/cluster elements) modal penceresinin ve karartma katmanının (backdrop) üzerinde kalmakta; karekodun ve modal içeriğinin önünü kapatarak görseli ve tıklanabilirliği bozmaktadır. z-index hiyerarşisinin düzeltilmesi (Modal: z-50/z-[100], Harita markerları: z-10) gerekmektedir.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Nuxt 3 Web Frontend & Harita Arayüzü

---

## 2. Kök Neden & Mimari Analiz
1. **Müşteri Ekran Görüntüsü Kanıtı:** Müşteri tarafından iletilen ekran görüntüsünde, `QrBridgeModal` ("İstasyonu Telefona Aktar") modal penceresi açıkken, haritadaki ZES istasyon pininin ("Z" logolu mavi damla pin) doğrudan QR kodun sağ alt köşesinin üzerine bindiği, modal karartma katmanını ve beyaz modal kutusunu delip geçtiği açıkça tespit edilmiştir.
2. **Kritik Kök Neden:** MapLibre GL kütüphanesi harita pinlerini (`.maplibregl-marker`) DOM içine eklerken donanım hızlandırmalı CSS 3D transform (`translate3d`) kullanır. Tarayıcılar 3D transform kullanılan elemanlar için yeni bir grafik kompozit katmanı (compositing layer) oluşturur. Modal bileşenleri (`QrBridgeModal`, `IssueReportModal` vb.) harita ile aynı DOM hiyerarşisinde (`index.vue` içindeki göreli container) kaldığında ve `z-50` değerine sahip olduğunda, GPU render katmanı modalın üzerine taşabilmektedir.
3. **Mimari Çözüm (3 Katmanlı Garanti):**
   - **`<Teleport to="body">`:** `QrBridgeModal.vue`, `ContributeModal.vue`, `IssueReportModal.vue`, `SourceHealthModal.vue` bileşenleri doğrudan `<body>` etiketine ışınlanarak harita DOM hiyerarşisinden ve yerel render katmanından tamamen yalıtılmalıdır.
   - **`z-[100]`:** Modal ana taşıyıcı sınıfı `z-50` yerine `z-[100]` yapılarak en üst hiyerarşi garanti altına alınmalıdır.
   - **`isolation: isolate`:** `VectorMap.vue` harita taşıyıcı div'ine (`#map` container) CSS `isolation: isolate` verilerek MapLibre'nin 3D ve z-index bağlamı harita kutusu içine hapsedilmelidir.

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`web_engineer`)
- `QrBridgeModal.vue`, `ContributeModal.vue`, `IssueReportModal.vue` bileşenlerini incele.
- `index.vue` ve `VectorMap.vue` içindeki CSS katman hiyerarşisini kontrol et.

### Aşama B: Kodlama ve Çözüm (`web_engineer`)
- `QrBridgeModal.vue`, `ContributeModal.vue`, `IssueReportModal.vue`, `SourceHealthModal.vue` şablonlarını `<Teleport to="body">` içine al.
- Backdrop ve modal wrapper için `z-[100]` sınıfını uygula.
- `VectorMap.vue` ana div'ine `isolation: isolate` stilini ekle.

### Aşama C: Test ve Ziyaretçi Doğrulaması (`uat_auditor` / `qa_lead`)
- Harita üzerinde bir istasyon seçip "Karekod ile Telefona Aktar" butonuna tıkla.
- İstasyon pinlerinin, kümeleme baloncuklarının modalın arkasında ve karartma katmanının (backdrop) altında kaldığını, QR kodun ve içeriğin %100 temiz ve engelsiz görüntülendiğini doğrula.
- 0 konsol hatası ve kusursuz görsel hiyerarşiyi onayla.

---

## 4. Kabul Kriterleri (Definition of Done)
- [ ] Müşterinin bildirdiği hata veya eksiklik tamamen ortadan kalktı.
- [ ] İlgili ekranda (`/`) görsel veya işlevsel bir kırılma yaşanmadı.
- [ ] Mevcut çalışan diğer rotalar ve özellikler bozulmadan korundu.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
