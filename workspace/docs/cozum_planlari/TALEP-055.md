# Studio Yetkilisi Çözüm Planı: TALEP-055

> **Talep:** [TALEP-055] [BUILD] S37-T1 derleme/import doğrulaması başarısız: [TALEP-053] Ana ekranda istasyonlar gelmiyor — backend modül hatasıyla çöküyor  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-30 08:30  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Deterministik kalite kapısı 'S37-T1' görevinde derleme/import doğrulaması başarısızlığı tespit etti.

Son çıktı satırları:
```
hijyen ihlali (2); 12 koruma referansı kaldırıldı (regresyon_uyarilari.md); regresyon testi eksik; derleme başarısız (import 27)
```

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Devin Analizi:**

Hızlıca ilgili kalite kapısı ve son değişikliklere bakayım.Şimdi gerçek hataları göreyim — değişen dosyalardaki çözülemeyen import'ları koşturuyorum.

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
