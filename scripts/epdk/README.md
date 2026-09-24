# EPDK Şarj İstasyonu Scraper

`lisans.epdk.gov.tr` üzerindeki lisanslı şarj istasyonu özet tablosunu
reCAPTCHA'lı JSF sayfasından otomatik toplar.

## Kurulum (bir kez)

```bash
cd scripts/epdk
npm install
```

Kurulu Google Chrome kullanılır (`channel: 'chrome'`) — ek binary indirilmez.

## Kullanım

```bash
node scrape.mjs                        # headless, tüm Türkiye
node scrape.mjs --il ANKARA            # il filtresi
node scrape.mjs --il ANKARA --ilce ÇANKAYA
node scrape.mjs --isletmeci "ZES..."   # işletmeci (tam ad)
node scrape.mjs --visible              # pencere aç (captcha'yı elle çözmek için)
node scrape.mjs --no-excel             # Excel indirmeden sadece tablo tara
EPDK_2CAPTCHA_KEY=xxx node scrape.mjs  # 2captcha ile %100 insansız
```

## Davranış

- Headless Chrome + Firefox user-agent + stealth plugin.
- reCAPTCHA kutusu otomatik tıklanır; genelde headless'ta anında geçer.
  Challenge çıkarsa `--visible` ya da `EPDK_2CAPTCHA_KEY` kullanılır.
- Sayfa başına 500 kayıt; sayfa geçişlerinde 15-30 sn rastgele bekleme
  (`--delay-min`/`--delay-max` ms cinsinden ayarlanabilir).
- Her sayfada "Raporla" ile .xlsx indirilir → `epdk_output/excel/`.
- Koşu başında önceki çıktılar `epdk_output/arsiv/<YYYY-MM-DDTHH-mm-ss>/`
  altına taşınır (günde 2+ koşu güvenli).
- Bitince tüm .xlsx'ler okunup birleşik `sarj_istasyonlari_excel_<ts>.json`
  üretilir; ayrıca DOM'dan okunan CSV+JSON da yazılır.

## Çıktılar (`epdk_output/`)

| Dosya | İçerik |
| --- | --- |
| `excel/epdk_sayfa_*.xlsx` | Sayfa başına EPDK "Raporla" export'u |
| `sarj_istasyonlari_excel_*.json` | Excel'lerden birleştirilmiş kayıtlar |
| `sarj_istasyonlari_*.csv/.json` | DOM'dan okunan tablo (yedek/doğrulama) |
| `arsiv/<tarih-saat>/` | Önceki koşunun tüm çıktıları |
