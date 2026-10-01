# Studio Yetkilisi Çözüm Planı: TALEP-053

> **Talep:** [TALEP-053] Ana ekranda istasyonlar gelmiyor — backend modül hatasıyla çöküyor  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-29 18:54  
> **Öncelik:** KRITIK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Test ortamında ana ekranı açtığımda haritada/listede hiçbir istasyon bilgisi görünmüyor. Beklentim, Türkiye genelindeki şarj istasyonlarının harita üzerinde listelenmesiydi; bunun yerine boş bir görünümle karşılaşıyorum. Tarayıcının yaptığı istasyon listesi isteği (/api/v1/stations?bbox=...&zoom=6) boş dönüyor. Sunucu loglarına baktığımda backend'in başlarken hata verip durduğunu görüyorum: 'ERR_MODULE_NOT_FOUND: Cannot find module .../src/modules/stations/stations.routes.js' — app.ts bu modülü import ederken dosyayı bulamıyor. Yani istasyon verilerini sunan servis hiç ayağa kalkamıyor ve ana ekran bu yüzden tamamen boş kalıyor. Test ortamı bu haliyle kullanılamaz durumda; acil düzeltilmesini rica ediyorum.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Devin Analizi:**

Hızlıca backend yapısını doğrulayıp kök nedeni teyit ediyorum.

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
