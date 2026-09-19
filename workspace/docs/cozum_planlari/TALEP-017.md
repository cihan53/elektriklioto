# Studio Yetkilisi Çözüm Planı: TALEP-017

> **Talep:** [TALEP-017] Canlı Kaynak Entegrasyonu: EPDK ve Voltrun verilerini gerçek sitelerden çek  
> **Müşteri / Bildiren:** elektriklioto.com Sahibi  
> **Bildirim Tarihi:** 2026-09-19 16:09  
> **Öncelik:** NORMAL | **Tür:** ISTEK  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (site sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Şu an import_cpo_stations.py, Voltrun ve ZES verilerini GitHub raw URL'lerinden (statik), EPDK verilerini de yine GitHub'daki eski bir dosyadan çekiyor. Müşteri isteği: (1) EPDK verileri doğrudan EPDK resmi sitesinden (epdk_scraper.py altyapısı kullanılarak) çekilmeli, (2) Voltrun istasyonları Voltrun'ın kendi API'sinden çekilmeli, (3) curl_input.txt dosyası her kaynağın cURL komutlarını 'kaynak: curl ...' formatında tutacak, ileride ZES ve diğer CPO'lar da eklenecek.

- **Etkilenen Ekran / URL:** `/data-pipeline`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

**1. Kök Neden:**
Sistem, canlı veri kaynakları yerine GitHub'daki statik/donmuş dosyalara bağımlı — yani entegrasyon katmanı hiç kurulmamış, sadece bir kerelik veri dökümü yapılıp repoya konmuş. `import_cpo_stations.py` kaynak-agnostik bir "fetcher" soyutlaması içermediği için her CPO/kurum ayrı bir statik URL'e hardcode edilmiş durumda; `epdk_scraper.py` altyapısı zaten var ama pipeline'a bağlanmamış, Voltrun için de resmi bir API entegrasyonu hiç yazılmamış.

**2. Kritik Riskler:**
- **Kimlik doğrulama & rate-limit:** Voltrun API'si muhtemelen auth (API key/token) gerektirecek — `curl_input.txt`'e secret yazılmamalı, .env/secret store kullanılmalı.
- **Scraping kırılganlığı:** EPDK sitesi resmi API sunmuyorsa HTML scraping yapısı değişebilir; `epdk_scraper.py` için hata toleransı ve fallback (son başarılı veri) mekanizması şart.
- **Format tutarlılığı:** `curl_input.txt`'in "kaynak: curl ..." formatı genişletilebilir olmalı (ZES ve gelecekteki CPO'lar için) — parser'ın bu formatı sağlam parse etmesi ve eksik/bozuk satırlarda pipeline'ı düşürmemesi gerekir.
- **Canlı veri kalitesi:** Statik dosyadan canlıya geçişte veri şeması (istasyon ID, koordinat, durum alanları) kaynaklar arası farklılık gösterebilir — mevcut normalize/mapping mantığının her yeni canlı kaynağa uyarlanması ve regresyon testiyle doğrulanması gerekir.

**İlgili Dosyalar & Modüller:**
   - `server-scripts/import_cpo_stations.py`
   - `epdk_scraper.py`
   - `curl_input.txt`
   - `server-scripts/`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: Kaynak & Ortam Analizi (`data_engineer`)
- `curl_input.txt` dosyasını incele — hangi kaynaklar (`epdk:`, `voltrun:`, `zes:`) tanımlı?
- `epdk_scraper.py` içindeki `parse_curl_command()` ve session yönetimini gözden geçir.
- `server-scripts/import_cpo_stations.py`'deki mevcut `load_json_dataset()` kaynak öncelik zincirini anla.

### Aşama B: Kodlama & Entegrasyon (`data_engineer`)
- `curl_input.txt`'i multi-source (`kaynak: curl ...`) formatında okuyacak bir parser modülü yaz/güncelle.
- Her kaynak için (`epdk`, `voltrun`, `zes`) ayrı bir scraper/fetcher fonksiyonu tanımla veya güncelle.
- `import_cpo_stations.py`'de GitHub raw URL fallback'i son sıraya al; önce yerel JSON, sonra canlı API denensin.
- Session süresi dolduğunda sistem açıkça uyarsın ve `curl_input.txt` güncellemesini rehberlik etsin.

### Aşama C: Test & Doğrulama (`data_engineer` + `qa_lead`)
- Test verisiyle tüm kaynak zincirini uçtan uca çalıştır.
- Boş veri gelmesi durumunda mevcut `cpo_stations.json`'ın EZİLMEDİĞİNİ doğrula (sıfır-kayıt kalkanı).
- `epdk_sarj_istasyonlari.json` çıktısının `import_cpo_stations.py` tarafından doğru okunduğunu kontrol et.

---

## 4. Kabul Kriterleri (Definition of Done)

- [ ] EPDK verisi doğrudan EPDK sitesinden (`epdk_scraper.py` aracılığıyla) çekiliyor.
- [ ] Voltrun verisi Voltrun API'sinden (`curl_input.txt`'teki `voltrun:` bloğu kullanılarak) çekiliyor.
- [ ] `curl_input.txt` multi-source formatı (`kaynak: curl ...`) doğru parse ediliyor.
- [ ] Hiçbir canlı kaynaktan veri gelmediğinde mevcut `cpo_stations.json` korunuyor.
- [ ] Yeni kaynak eklemek için sadece `curl_input.txt`'e satır eklemek yeterli.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
