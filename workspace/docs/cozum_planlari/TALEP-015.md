# Studio Yetkilisi Çözüm Planı: TALEP-015

> **Talep:** [TALEP-015] EPDK ve CPO Kamu/Açık Kaynaklarından Canlı İstasyon Senkronizasyonu  
> **Müşteri / Bildiren:** elektriklioto.com Sahibi  
> **Bildirim Tarihi:** 2026-09-18 17:21  
> **Öncelik:** NORMAL | **Tür:** ISTEK  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `backend_engineer` (Backend & API Mühendisi (Fastify & PostGIS))  

---

## 1. Müşteri Talebi ve Problem Tanımı
Müşteri (site sahibi) denetimi sırasında aşağıdaki durumu tespit etti:
> **Açıklama:**  
> Müşteri isteği: İstasyon senkronizasyonu için EPDK web sitesi/listesi (public) kullanılmalı, ayrıca firmaların her biri (ZES, Trugo, Eşarj, Voltrun vb.) için istasyon bilgilerinin çekileceği açık servis/endpoint adresleri tespit edilip cron mekanizmasına bağlanmalı.

- **Etkilenen Ekran / URL:** `/cron/sync`
- **Hedef Bileşen Grubu:** Backend API & Servis Katmanı

---

## 2. Kök Neden & Mimari Analiz
1. **İnceleme:** Gelen geri bildirim, sistemin kullanıcı deneyimi ve iş mantığı açısından değerlendirilmiştir.
2. **Kritik Nokta:** İlgili davranışın çözülmesi için `Backend API & Servis Katmanı` üzerinde gerekli kod ve şablon düzenlemeleri yapılacaktır.
3. **İlgili Dosyalar & Modüller:**
   - `workspace/src/backend/src/modules/`
   - `workspace/src/backend/src/app.ts`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`backend_engineer`)
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
- [ ] İlgili ekranda (`/cron/sync`) görsel veya işlevsel bir kırılma yaşanmadı.
- [ ] Mevcut çalışan diğer rotalar ve özellikler bozulmadan korundu.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
