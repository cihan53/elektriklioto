# Başlarken

## 1. Kapsamı yaz  ← en önemli adım
`proje_kapsami.md` dosyasını doldur. Boş bıraktığın her bölüm için roller
varsayım üretir. Özellikle **6. Başarı Ölçütleri** ölçülebilir olsun.

İki bölümün farkı kritik:
- **5. Kısıtlar** → verilmiş kararlar. Kesin olanların sonuna `(zorunlu)` yaz.
- **7. Açık Sorular** → buraya yazdığını model KENDİ karara bağlar.

## 2. Org şemasını projene uyarla
`org_chart.json` 9 rollük jenerik bir iskelet. Projene göre rol ekle/çıkar.
Her rolde: `stage` (design/build), `backend` (cli/agy/api), `model`,
`max_words`, isteğe bağlı `tools`.

Kabuk gerektiren roller `cli` arka ucunda olmalı — izin deseni yalnızca orada
CLI seviyesinde zorlanır.

## 3. Ön koşullar
```bash
./basla.sh --kontrol
```
`claude` CLI (ve şemada varsa `agy`) kurulu olmalı. venv ve `anthropic`
paketini script kendisi kurar.

## 4. Git — kabuk yetkisi vermeden ÖNCE
```bash
git init && git add -A && git commit -m "başlangıç"
```
Ajanlara komut çalıştırma yetkisi vereceksen geri dönüş noktası şart.

## 5. Çalıştır
```bash
./basla.sh
```
Tasarım aşaması (roller sırayla) → sprint panosu → yapım aşaması (pano).

## Günlük kullanım
```bash
./basla.sh --izle      # kontrol ekranı (p duraklat, s durdur, k atla)
./basla.sh --durum     # tek satırlık özet + harcama + kota
./basla.sh --onayla    # günlük kota dolduğunda bir tur daha izin ver
./basla.sh --durdur    # nazik durdurma
./basla.sh --sifirla   # ilerlemeyi sıfırla (çıktılar _arsiv/ altına)
```

## Bütçe
Varsayılan günlük kota: **3 görev / 2 USD**. Sınıra yaklaşınca durur ve
`--onayla` bekler. Değiştirmek için `STUDIO_GUNLUK_GOREV`, `STUDIO_GUNLUK_BUTCE`.

Zamana yaymak için launchd (15 dakikada bir tek görev):
```bash
cp studio.tick.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/studio.tick.plist
```

## Ayarlar
| Değişken | Varsayılan | Ne yapar |
|---|---|---|
| `STUDIO_BACKEND` | `cli` | Genel arka uç (cli/agy/api) |
| `STUDIO_CLI_MODEL` | `sonnet` | claude CLI modeli |
| `STUDIO_AGY_MODEL` | `gemini-3.1-pro-high` | agy modeli |
| `STUDIO_EFFORT` | `high` | Düşünme derinliği |
| `STUDIO_DOC_WORDS` | `1800` | Varsayılan kelime bütçesi |
| `STUDIO_GUNLUK_GOREV` | `3` | Günlük görev kotası |
| `STUDIO_GUNLUK_BUTCE` | `2.0` | Günlük harcama sınırı (USD) |
| `STUDIO_RESPECT_CALENDAR` | `0` | `1` ise sprint tarihinden önce başlamaz |

## Okumadan başlama
`OGRENILENLER.md` — bu boru hattını kurarken bedeli ödenmiş dersler.
Yeni bir stüdyo kurarken en az bir kez göz gezdir.
