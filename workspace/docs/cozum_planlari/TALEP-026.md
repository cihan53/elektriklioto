# Studio Yetkilisi Çözüm Planı: TALEP-026

> **Talep:** [TALEP-026] Sürüm Notları ve Güncellemeler Ekranının Çözülen Taleplerle Senkronize Olmaması  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-26 10:35  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Sitedeki 'Sürüm Notları & Güncellemeler' sayfasını incelediğimde, sistemde çözüldüğü belirtilen yeni geliştirmelerin veya kapatılan taleplerin bu ekrana yansımadığını ve listenin eski kaldığını gördüm. Kullanıcı olarak bir hata düzeltildiğinde veya yeni bir özellik eklendiğinde, sürüm günlüğü ekranında en güncel değişiklikleri ve yeni sürüm maddelerini anında görmek istiyorum. Çözülen işlerin sürüm notları listesine otomatik yansıması ve sayfanın güncel durumu yansıtması gerekiyor.

- **Etkilenen Ekran / URL:** `/guncellemeler`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

1. **Kök Neden:** "Sürüm Notları" ekranı büyük olasılıkla statik bir içerik kaynağından (elle güncellenen bir dosya/tablo veya sabit kodlanmış liste) besleniyor; talep/issue kapatma (git commit, "closes #X") ile bu ekranın veri kaynağı arasında herhangi bir otomatik bağlantı veya pipeline yok. Yani "çözüldü" durumu sadece proje/issue takip sisteminde işaretleniyor, ama bunu `/guncellemeler` sayfasına yazan bir senkronizasyon adımı (CI hook, webhook, build-time script) tanımlı değil.

2. **Kritik Riskler:**
- Otomatik senkronizasyon kurulurken hangi commit/issue'ların "kullanıcıya görünür" sürüm notu sayılacağına dair bir filtre gerekir (örn. sadece `closes #`, `fix(talep-...)` formatındaki commit'ler); aksi halde iç/teknik düzeltmeler de son kullanıcıya sızabilir.
- Commit mesajları teknik dilde yazılmış (örn. "Canlı Sürüm Bilgisi Ekranında..."), bunların kullanıcıya dönük, anlaşılır bir dile çevrilmesi gerekebilir — otomasyon ham commit mesajını doğrudan yayınlarsa kalite düşer.
- Yayına alma (deploy) ile sürüm notu güncellemesi aynı anda tetiklenmezse, ekran yine gecikmeli/kararsız görünebilir; senkronizasyonun deploy pipeline'ının bir parçası olması gerekir, ayrı/manuel bir adım olmamalı.

**İlgili Dosyalar & Modüller:**
   - `scripts/`
   - `server-scripts/`
   - `curl_input.txt`

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
