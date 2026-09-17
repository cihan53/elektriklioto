# Studio Yetkilisi Çözüm Planı: TALEP-012

> **Talep:** [TALEP-012] Yeni deploy çıktığında açık sayfalarda güncelleme uyarısı çıkması ve 20 saniyede otomatik yenilenmesi  
> **Müşteri / Bildiren:** elektriklioto.com Sahibi  
> **Bildirim Tarihi:** 2026-09-18 00:10  
> **Öncelik:** YUKSEK | **Tür:** ISTEK  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `devops_engineer` (DevOps & Dağıtım Mühendisi)  

---

## 1. Müşteri Talebi ve Problem Tanımı
Müşteri (site sahibi) denetimi sırasında aşağıdaki durumu tespit etti:
> **Açıklama:**  
> Müşteri Talebi: Eğer bir deploy çıkarsa tüm açık olan sayfaların uyarı verip yenilenmesini istesin kullanıcıdan, eğer 20sn içinde cevap vermez ise yinede yenilesin. Frontend tarafında periyodik sürüm kontrolü (version/build hash polling) yapılarak yeni deploy algılandığında kullanıcıya 'Yeni sürüm yayınlandı, sayfa güncelleniyor (20s)' geri sayımlı modal/toast gösterilmeli, 'Şimdi Yenile' butonu sunulmalı ve 20 saniye dolduğunda otomatik reload yapılmalıdır.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Altyapı & Dağıtım (Infra)

---

## 2. Kök Neden & Mimari Analiz
1. **İnceleme:** Gelen geri bildirim, sistemin kullanıcı deneyimi ve iş mantığı açısından değerlendirilmiştir.
2. **Kritik Nokta:** İlgili davranışın çözülmesi için `Altyapı & Dağıtım (Infra)` üzerinde gerekli kod ve şablon düzenlemeleri yapılacaktır.
3. **İlgili Dosyalar & Modüller:**
   - `workspace/infra/`
   - `cpanel_nuxt_entry.cjs`
   - `cpanel_api_entry.cjs`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`devops_engineer`)
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
