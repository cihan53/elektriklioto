# Studio Yetkilisi Çözüm Planı: TALEP-018

> **Talep:** [TALEP-018] TALEP-017 Eksik İş Kapanışı: curl_input.txt deploy paketinde olmadığı için canlı kaynaklar yerine GitHub raw'a fallback yapılıyor  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-23 20:26  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Müşteri sahada (uzak sunucuda) cron senkronizasyonunu test ettiğinde sistemin canlı API uç noktaları yerine https://raw.githubusercontent.com/... adreslerine fallback yaptığı görüldü. Nedeni: curl_input.txt dosyasının .github/workflows/deploy.yml içerisindeki deploy_package.tar.gz arşivine dahil edilmemiş olması. Studio ajanlarının bu eksikliği yerel UAT aşamasında deploy zincirini denetleyerek tespit etmesi ve sunucuya aktarılmasını sağlaması gerekirdi. Düzeltme: 1) deploy.yml paketine curl_input.txt dosyasının eklenmesi, 2) sunucuya dağıtımın sağlanması, 3) sunucuda cron_daily_sync.sh çalıştırıldığında GitHub raw linklerine düşmeden canlı kaynaklardan veri çekildiğinin doğrulanması.

- **Etkilenen Ekran / URL:** `/server-scripts/deploy`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

1. **Kök Neden:** `.github/workflows/deploy.yml` içindeki paketleme (tar/archive) adımı muhtemelen dosyaları whitelist/glob ile seçiyor ve `curl_input.txt` bu listeye dahil edilmemiş; bu yüzden `deploy_package.tar.gz` içinde eksik kalmış. Sunucudaki `cron_daily_sync.sh` bu dosyayı bulamayınca canlı API çağrısı yerine kod içindeki fallback mantığına (GitHub raw URL) düşmüş — yani asıl hata deploy paketleme kapsamı eksikliği, cron script'inin fallback davranışı sadece bunu sessizce maskelemiş.

2. **Kritik Riskler:**
 - Sessiz fallback (silent fallback) mekanizması: script hata fırlatmadan raw GitHub'a düşüyor, bu da üretimde fark edilmeden yanlış/gecikmeli veri kullanılmasına yol açabilir — deploy sonrası mutlaka canlı kaynaktan çekildiği loglardan doğrulanmalı (fallback tetiklenirse alarm/log seviyesi yükseltilmeli).
 - `deploy.yml`'e sadece bu dosyayı eklemek yeterli değil; paketleme adımı whitelist tabanlıysa başka gerekli dosyaların da aynı şekilde eksik kalma riski var — tüm runtime bağımlılıkları (config, input dosyaları) için paketleme listesi denetlenmeli.
 - Sunucuya manuel/otomatik dağıtım sonrası eski (stale) `deploy_package.tar.gz` veya cache'lenmiş sürüm kalmadığından emin olunmalı; cron'un bir sonraki çalışmasını beklemeden manuel tetiklenip doğrulanmalı.
 - `curl_input.txt` içeriğinde hassas veri (API anahtarı, endpoint bilgisi) varsa repo/paket içine dahil edilmesi güvenlik açısından da gözden geçirilmeli.

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
