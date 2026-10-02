# Studio Yetkilisi Çözüm Planı: TALEP-072

> **Talep:** [TALEP-072] [DEPLOY-CI/CD] GitHub Actions cPanel dağıtımı başarısız oldu (Run #36981971903)  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-10-02 18:11  
> **Öncelik:** NORMAL | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> GitHub Actions 'Deploy to cPanel & Create Version Tag' iş akışı canlıya dağıtım yaparken çöktü.

**Run ID:** 36981971903

**Başarısız Olan Adım Logları:**
```
Build & Deploy to cPanel	UNKNOWN STEP	﻿2026-10-02T08:04:39.0883061Z Current runner version: '2.337.0'
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0913920Z ##[group]Runner Image Provisioner
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0915560Z Hosted Compute Agent
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0916800Z Version: 20260901.588
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0918156Z Commit: f88ec8081b781fac6c440065ac7ff9e710ce3d0b
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0919601Z Build Date: 2026-09-01T19:56:44Z
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0920936Z Worker ID: {841e6e2f-e0c5-43ff-b88f-99715ea82545}
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0922580Z Azure Region: eastus
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0923819Z ##[endgroup]
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0926418Z ##[group]Operating System
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0927732Z Ubuntu
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0928895Z 24.04.5
Build & Deploy to cPanel	UNKNOWN STEP	2026-10-02T08:04:39.0929992Z LTS
Build 
```

Ajanların bu hatayı inceleyip workflow veya kaynak kodundaki derleme/dağıtım sorununu çözmesi gerekmektedir.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Devin Analizi:**

Workflow tanımını ve ilgili build/deploy adımlarını hızlıca kontrol ediyorum; paylaşılan log yalnızca runner başlangıcını gösterdiği için kesin kök nedeni logdan ayırmak gerekiyor.

**İlgili Dosyalar & Modüller:**
   - `scripts/`
   - `server-scripts/`
   - `curl_input.txt`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: Kaynak & Ortam Analizi (`data_engineer`)
- `curl_input.txt` dosyasını incele — hangi kaynaklar tanımlı (`kaynak: curl ...` formatı)?
- İlgili scraper/fetcher scriptlerinin session ve auth yönetimini gözden geçir.
- Mevcut `load_json_dataset()` veya eşdeğeri kaynak öncelik zincirini anla.

### Aşama B: Kodlama & Entegrasyon (`data_engineer`)
- `curl_input.txt`'i multi-source (`kaynak: curl ...`) formatında okuyacak bir parser modülü yaz/güncelle.
- Her kaynak için (`epdk`, `voltrun`, `zes`) ayrı bir scraper/fetcher fonksiyonu tanımla veya güncelle.
- Kaynak fallback zincirini güncelle: önce yerel cache, sonra canlı API, en son statik fallback.
- Session süresi dolduğunda sistem açıkça uyarsın ve `curl_input.txt` güncellemesini rehberlik etsin.

### Aşama C: Test & Doğrulama (`data_engineer` + `qa_lead`)
- Test verisiyle tüm kaynak zincirini uçtan uca çalıştır.
- Boş veri gelmesi durumunda mevcut `cpo_stations.json`'ın EZİLMEDİĞİNİ doğrula (sıfır-kayıt kalkanı).
- Scraper çıktı JSON dosyasının pipeline tarafından doğru okunduğunu kontrol et.

---

## 4. Kabul Kriterleri (Definition of Done)

- [ ] EPDK verisi doğrudan EPDK sitesinden (`epdk_scraper.py` aracılığıyla) çekiliyor.
- [ ] Voltrun verisi Voltrun API'sinden (`curl_input.txt`'teki `voltrun:` bloğu kullanılarak) çekiliyor.
- [ ] `curl_input.txt` multi-source formatı (`kaynak: curl ...`) doğru parse ediliyor.
- [ ] Hiçbir canlı kaynaktan veri gelmediğinde mevcut `cpo_stations.json` korunuyor.
- [ ] Yeni kaynak eklemek için sadece `curl_input.txt`'e satır eklemek yeterli.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
