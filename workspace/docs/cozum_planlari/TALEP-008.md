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
1. **İnceleme:** Gelen geri bildirim, sistemin kullanıcı deneyimi ve iş mantığı açısından değerlendirilmiştir.
2. **Kritik Nokta:** İlgili davranışın çözülmesi için `Nuxt 3 Web Frontend & Harita Arayüzü` üzerinde gerekli kod ve şablon düzenlemeleri yapılacaktır.
3. **İlgili Dosyalar & Modüller:**
   - `workspace/src/frontend/components/`
   - `workspace/src/frontend/pages/`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`web_engineer`)
- İlgili dosyalardaki mevcut state, rota parametreleri ve bileşen event akışını kontrol et.
- Sorunun canlı veya lokal ortamda (`./canli.sh` -> 3000 / 3001) yeniden üretilebilirliğini teyit et.

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
- [ ] İlgili ekranda (`/`) görsel veya işlevsel bir kırılma yaşanmadı.
- [ ] Mevcut çalışan diğer rotalar ve özellikler bozulmadan korundu.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
