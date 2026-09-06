# Veri Kaynağı Raporu — EPDK Şarj İstasyonu Kaydı

> Bu dosya `istasyonlar.json` dosyası **ölçülerek** üretilmiştir; model çıktısı değildir.
> Sayılar dosyanın kendisinden sayılmıştır, tahmin yoktur.

- Dosya: `istasyonlar.json` (7.4 MB)
- Kaynak: EPDK Şarj İstasyonları Sorgulama Sistemi
- Kaynak URL: https://lisans.epdk.gov.tr/epvys-web/faces/pages/lisans/elektrikSarjAgiIsletmeci/sarjIstasyonuOzetSorgula.xhtml
- Çekim tarihi: 2026-09-06T14:42:57.333897
- Kayıt sayısı: **16.788** istasyon · **179** tekil marka · **176** tekil şarj ağı işletmecisi

## Alan Envanteri ve Doluluk

| Alan | Dolu kayıt | Doluluk | Not |
|---|---:|---:|---|
| `istasyon_no` | 16.788 | 100.0% | EPDK resmî tekil kimlik (`ŞRJ/xxxx`) — kanonik anahtar adayı |
| `istasyon_adi` | 16.788 | 100.0% | Serbest metin. tesis adı |
| `hizmet_sekli` | 16.788 | 100.0% | `Halka Açık` / `Özel` — tüketici haritasında filtre şartı |
| `marka` | 16.788 | 100.0% | CPO markası (ZES. Trugo vb.) |
| `sarj_agi_isletmecisi` | 16.788 | 100.0% | Lisanslı tüzel kişi unvanı |
| `sarj_istasyonu_isletmecisi` | 16.788 | 100.0% | Lisanslı tüzel kişi unvanı |
| `adres` | 16.768 | 99.9% | Serbest metin; koordinat DEĞİL |
| `soket_bilgileri` | 0 | 0.0% | **TAMAMEN BOŞ** — soket tipi/güç verisi yok |

- Tekrarlı `istasyon_no`: **28** (0 ise alan birincil anahtar olarak kullanılabilir)

## KONUM — KULLANICI KARARI (bağlayıcı)

> Mevcut dosyada koordinat alanı yok, ancak **zenginleştirilmiş sürümde her istasyon kaydı
> `lat` ve `lon` alanlarını taşıyacaktır.** Bu bir varsayım değil, kullanıcının verdiği karardır.
>
> Sonuçları:
> - Tasarım ve mimari, istasyon koordinatının **mevcut olduğunu** kabul eder.
> - PostGIS `geom` sütunu `lat`/`lon` alanlarından doğrudan üretilir (`ST_SetSRID(ST_MakePoint(lon, lat), 4326)`).
> - `GIST(geom)` indeksi, `ST_MakeEnvelope` viewport sorgusu ve `ST_DWithin` yakınlık eşleştirmesi
>   olduğu gibi geçerlidir — değiştirilmesine gerek yoktur.
> - **Geocoding hattı planlanmaz.** Adres metninden koordinat türetme işi kapsam dışıdır.

## HÂLÂ EKSİK OLANLAR (mimariyi doğrudan ilgilendirir)

| İhtiyaç | Bu veride | Sonuç |
|---|---|---|
| Soket tipi (CCS/Type2/CHAdeMO) | **YOK** (%0) | Kapsamdaki "Gelişmiş Filtreleme" özelliği bu veriyle çalışmaz. |
| Güç (kW) | **YOK** (%0) | AC/DC ve 120kW+ filtresi beslenemez. |
| Anlık doluluk / soket durumu | **YOK** | "< 15 dk veri tazeliği" ölçütünün kaynağı bu dosya değildir. |
| Tarife / fiyat | **YOK** | Canlı tarife ekranı beslenemez. |

## Şu Anda Neyi Besleyebilir

- **Kanonik istasyon omurgası:** EPDK `istasyon_no` resmî ve tekil; mimarideki `station_uid` eşleştirme
  probleminin doğal çapası. Ham CPO kayıtları bu omurgaya bağlanabilir.
- **Operatör / marka sözlüğü:** 179 marka ve lisanslı işletmeci unvanları — `operator` tablosu tohumu.
- **SEO dizin sayfaları:** Adresten il çıkarımı 16.763/16.788 kayıtta (%99.9) başarılı.
- **Halka açık filtresi:** 13.060 halka açık. 3.728 özel.

## Marka Dağılımı (ilk 15)

| Marka | İstasyon |
|---|---:|
| zes | 1.940 |
| Trugo | 1.376 |
| VOLTRUN | 1.147 |
| eşarj | 763 |
| wat mobilite | 709 |
| ZEPLİN CAR rental | 550 |
| Otopriz | 509 |
| ASTOR | 355 |
| EN YAKIT | 344 |
| beefull | 319 |
| Otojet | 276 |
| oncharge | 249 |
| AKSA ŞARJ | 224 |
| D-Charge | 219 |
| 5 şarj | 202 |

## İl Dağılımı (ilk 15)

| İl | İstasyon |
|---|---:|
| İSTANBUL | 4.387 |
| ANKARA | 2.090 |
| ANTALYA | 941 |
| İZMİR | 759 |
| BURSA | 715 |
| MUĞLA | 479 |
| KOCAELİ | 396 |
| KONYA | 361 |
| KAYSERİ | 351 |
| BALIKESİR | 336 |
| MERSİN | 322 |
| DİYARBAKIR | 279 |
| DENİZLİ | 247 |
| SAMSUN | 245 |
| ADANA | 243 |

> **Kullanıcı notu:** Bu JSON zenginleştirilecektir. Koordinat (`lat`/`lon`) **kesin gelecek** ve
> tasarımda var kabul edilir. Soket tipi, güç, tarife ve anlık doluluk ise henüz belirsizdir —
> şema bu alanları `NULL` kabul edecek şekilde tasarlanmalı, veri geldiğinde göç ile doldurulmalıdır.
> Arayüz bu alanlar boşken de anlamlı görünmek zorundadır (tasarımda 'veri yok' durumu tanımlı olmalı).
