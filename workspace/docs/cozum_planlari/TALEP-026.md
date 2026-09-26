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

**1. Kök Neden:**
"Sürüm Notları & Güncellemeler" (/guncellemeler) ekranı büyük ihtimalle statik bir içerikten (elle yazılan bir liste, sabit bir JSON/DB tablosu ya da hardcoded sayfa) besleniyor ve talep/işlem kapatma akışıyla (workspace/docs/musteri_talepleri.json ve TALEP çözüm kayıtları) hiçbir otomatik entegrasyonu yok. Yani bir talep "closes #XX" ile kapatılıp deploy edildiğinde, bu commit/talep durumu değişikliği sürüm notları veri kaynağına yazmıyor — iki sistem (talep takibi ve sürüm notu ekranı) birbirinden kopuk, elle senkronizasyon gerektiriyor.

**2. Kritik Riskler:**
- Otomatik yayına almadan (failover-deploy commit'lerinde görüldüğü gibi) doğrudan sürüm notu üretilirse, kullanıcıya henüz test edilmemiş/geri alınmış değişiklikler "yayında" gibi görünebilir — sürüm notu üretimi sadece prod'a gerçekten çıkan ve doğrulanan işler için tetiklenmeli.
- Talep başlıklarının (örn. "TALEP-025") doğrudan kullanıcıya gösterilecek sürüm notu metnine dönüştürülmesi gerekir; iç jargon/teknik detay sızdırılmamalı, ayrı bir "kullanıcı dostu özet" alanı olmalı.
- Otomasyon eklerken idempotency önemli: aynı talep birden fazla commit'te geçiyorsa (bkz. d9026b2'deki regex tabanlı talep_id tespiti) mükerrer sürüm notu satırı oluşmamalı.

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
