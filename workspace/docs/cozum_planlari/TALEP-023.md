# Studio Yetkilisi Çözüm Planı: TALEP-023

> **Talep:** [TALEP-023] Tüm operatörler alanında sadece 5 marka görünüyor, EPDK'daki 170+ operatör/marka eksik  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-26 10:05  
> **Öncelik:** YUKSEK | **Tür:** VERI  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Müşteri bildirimi: Tüm operatörler alanında 5 marka görünüyor , ama epdk da 170 ten fazla marka var , eksik mi işleniyor veriler. EPDK'da yer alan 170+ lisanslı şarj ağı işletmecisi/markasının operatör filtresi ve listelerinde yer alması, veri senkronizasyonunun incelenmesi gerekiyor.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

**1. Kök Neden:** Sistem yalnızca EPDK sitesinden manuel cURL ile alınan istasyon (`sarjIstasyonlari`) verisini işliyor; operatör/marka listesi muhtemelen ayrı bir EPDK "lisanslı şarj ağı işletmecisi" kaynağından (farklı endpoint/sayfa) beslenmiyor, dolayısıyla sadece o an istasyonu olan/verisi çekilen 5 marka görünüyor, 170+ lisanslı marka ayrı bir referans listesinden senkronize edilmiyor. Muhtemelen operatör filtresi `stations` tablosundaki mevcut kayıtlardan `DISTINCT operator` çekiliyor, statik/ayrı bir "tüm lisanslı operatörler" tablosu yok.

**2. Kritik Riskler:** EPDK'nın reCAPTCHA korumalı sitesi ve quota'lı `apigateway` API'si otomasyona kapalı (daha önce denendi, [[epdk-data-refresh]]), bu yüzden 170+ markanın tam listesini otomatik çekmek mümkün olmayabilir — manuel/yarı-manuel bir veri kaynağı (örn. EPDK'nın lisans listesi PDF/sayfası) bulunup ayrı senkronize edilmeli; ayrıca "marka" ile "aktif istasyonu olan operatör" kavramları karıştırılmamalı çünkü müşteri "170 marka listede görünmeli" derken aslında lisanslı-ama-istasyonsuz markaları da bekliyor olabilir, bu da UX/iş kararı gerektirir (filtrede istasyonu olmayan markalar gösterilsin mi?).

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
