# Başlarken

## 1. Kapsamı yaz  ← en önemli adım
`proje_kapsami.md` dosyasını doldur. Boş bıraktığın her bölüm için roller
varsayım üretir. Özellikle **6. Başarı Ölçütleri** ölçülebilir olsun.

İki bölümün farkı kritik:
- **5. Kısıtlar** → verilmiş kararlar. Kesin olanların sonuna `(zorunlu)` yaz.
- **7. Açık Sorular** → buraya yazdığını model KENDİ karara bağlar.

## 2. Org şemasını projene uyarla
`org_chart.json` 11 rollük sanal stüdyo iskeleti. Projene göre rol ekle/çıkar.
Her rolde: `stage` (design/build), `backend` (agy), `model` (gemini-3.1-pro-high / gemini-3.8-flash-high),
`max_words`, isteğe bağlı `tools`.

Boru hattı tamamen Google Antigravity (`agy`) CLI ve Gemini modelleri ile çalışır.

## 3. Ön koşullar
```bash
./basla.sh --kontrol
```
`agy` CLI (`~/.local/bin/agy`) kurulu olmalıdır. venv ortamı script tarafından otomatik yönetilir.

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

## Bütçe ve Tempo
Varsayılan günlük tempo: **3 görev**. Sınıra yaklaşınca durur ve
`--onayla` bekler. Değiştirmek için `STUDIO_GUNLUK_GOREV`.

Zamana yaymak için launchd (15 dakikada bir tek görev):
```bash
cp studio.tick.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/studio.tick.plist
```

## Ayarlar
| Değişken | Varsayılan | Ne yapar |
|---|---|---|
| `STUDIO_BACKEND` | `agy` | Genel arka uç (Antigravity agy) |
| `STUDIO_AGY_MODEL` | `gemini-3.1-pro-high` | Varsayılan agy modeli |
| `STUDIO_EFFORT` | `high` | Düşünme derinliği (low/medium/high) |
| `STUDIO_DOC_WORDS` | `1800` | Varsayılan kelime bütçesi |
| `STUDIO_GUNLUK_GOREV` | `3` | Günlük görev kotası |
| `STUDIO_RESPECT_CALENDAR` | `0` | `1` ise sprint tarihinden önce başlamaz |

## Okumadan başlama
`OGRENILENLER.md` — bu boru hattını kurarken bedeli ödenmiş dersler.
Yeni bir stüdyo kurarken en az bir kez göz gezdir.
