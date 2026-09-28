Canlı sistem üzerinde denetim tamamlandı. Rapor içeriği aşağıdadır.

```markdown
# UAT Kabul Raporu — S30 / TALEP-044

> **Sprint:** S30 — Müşteri Denetimi & Saha Onarımları (TALEP-044)
> **Görev:** S30-T2 · [TALEP-044] Müşteri Kabulü & UAT Doğrulama Denetimi
> **Denetim Tarihi:** 2026-09-28 21:05–21:20
> **Denetleyen Rol:** uat_auditor (canlı sistem üzerinde, mock/birim test çıktılarına güvenilmeden)
> **Canlı Ortam:** Backend Fastify `http://127.0.0.1:3001` (HTTP 200), Nuxt Web `http://127.0.0.1:3000` (HTTP 200)
> **Tarayıcı Motoru:** Chromium (Playwright, 1440x900, gerçek DOM + ağ + konsol izlemesi)

---

## 1. Kapsam ve Talebin Gerçek İçeriği

TALEP-044, müşterinin **TALEP-041**'in (Tüm Operatörler menüsündeki markaların istasyon sayısına göre sıralanması) beklemeye alınmayıp öncelikli olarak sprinte alınmasını ve planlama sonrası tahmini tamamlanma tarihinin bildirilmesini istediği kayıttır. Dolayısıyla kabul iki eksende denetlenmiştir:

- **A) İşlevsel eksen:** TALEP-041'in istediği sıralama davranışı canlıda çalışıyor mu?
- **B) Süreç / izlenebilirlik ekseni:** TALEP-041 gerçekten işleme alınıp kaydı güncellendi mi, müşteriye ETA bildirimi kayda geçti mi?

> **Varsayım:** S30-T1 çıktısı olan `components/map/FilterChips.vue` değişikliği ve yeni `pages/operatorler.vue` sayfası TALEP-044 kapsamındaki teslimat kabul edilmiştir (pipeline.log S30-T1 çıktı kaydı). TALEP-044 için `workspace/docs/cozum_planlari/TALEP-044.md` deposunda **yoktur**; kabul kriterleri talep metninden ve TALEP-041 gövdesinden türetilmiştir.

---

## 2. UAT Sonuç Tablosu

| # | Test Adımı (Canlı) | Beklenen | Ölçülen | Sonuç |
|---|---|---|---|---|
| U-01 | Servis ayakta mı? | 3000 ve 3001 → 200 | `3001: 200`, `3000: 200` | **BAŞARILI** |
| U-02 | Ana sayfa `/` → "Tüm Operatörler" menüsü açılışı | Menü açılır, marka listesi dolu | 179 marka listelendi, tamamında istasyon sayısı etiketi var | **BAŞARILI** |
| U-03 | **TALEP-041 çekirdek kriteri:** menü sıralaması | İstasyon sayısına göre çoktan aza | `ZES(1940) → Trugo(1376) → Voltrun(1147) → Eşarj(763) → Wat Mobilite(709) → …`; 179/179 kayıt için `DESC_SORTED = true` | **BAŞARILI** |
| U-04 | Menüde arama sonrası sıralama korunuyor mu? | Filtrelenmiş liste de çoktan aza | `filteredOperators` sıralı kaynağı tüketiyor, arama sonrası sıra bozulmuyor | **BAŞARILI** |
| U-05 | Yeni `/operatorler` dizin sayfası | 200 + SSR HTML + sıralı liste | 200, `<title>Tüm Şarj Operatörleri ve Markaları`, 179 operatör kartı, sıra `DESC = true`, rozetlerde sıra numarası (1..n) ve "1.940 istasyon" | **BAŞARILI** |
| U-06 | `/operatorler` sıralama anahtarları | İstasyon Sayısı (varsayılan) / Alfabetik | İki düğme mevcut, varsayılan "İstasyon Sayısı" seçili; başlıkta "179 şarj ağı operatörü ve 16.776 istasyon" | **BAŞARILI** |
| U-07 | Türkiye geneli kümeleme (zoom 6) | Küme dairesi sayısı > 0 | API `type=clusters`, 71–81 küme, toplam 17.332 istasyon; haritada sayılı daireler görünür (İstanbul 4525, Ankara 2174) | **BAŞARILI** |
| U-08 | Büyükşehir kümesine odaklanma ve zoom 10-12 | 500+ tekil pin haritaya düşer | İstanbul bbox `28.5,40.8,29.5,41.2` zoom 11 → `stations: 2000` kayıt; zoom 13→16 sırasında pinler canvas üzerinde tekil olarak render edildi (Kadıköy ekran görüntüsü) | **BAŞARILI** |
| U-09 | Pin/İstasyon seçimi → detay paneli | Panel açılır, kanonik alanlar dolu | Panelde `ŞRJ/…` sicil no, operatör adı/logosu, adres, "Son güncelleme" tazelik rozeti mevcut | **BAŞARILI** |
| U-10 | Eksik veri görsel dili (PO-301) | Soket/güç/tarife boşken "Operatör Verisi Bekleniyor" + Bilgi Ekle | Panelde rozet ve `+ Bilgi Ekle` butonu render edildi; uydurma değer yok | **BAŞARILI** |
| U-11 | Derin bağlantı / pano fallback (PO-401) | Şema yoksa istasyon kodu panoya kopyalanır + bildirim | `Operatör Web Sitesine Git ↗` tıklandı → pano içeriği `ŞRJ/1002`, "kopyalandı" bildirimi ekrana düştü | **BAŞARILI** |
| U-12 | Konsol denetimi: `TypeError: Cannot read properties of undefined` | 0 eşleşme | 0 `pageerror`, 0 TypeError (harita, detay paneli, `/operatorler` akışlarında) | **BAŞARILI** |
| U-13 | Ağ denetimi: uygulama API'sinde `400 Bad Request` | 0 istenmeyen 400 | Gerçek kullanıcı akışlarında 0 adet 400. Kasıtlı hatalı girdide (`min_lon > max_lon`, `bbox=abc`) API RFC 7807 formatında 400 döndü — beklenen davranış | **BAŞARILI** |
| U-14 | Regresyon süiti (deterministik) | Kırılma yok | Frontend `vitest`: 9 dosya / **59 test geçti** (TALEP-023/024/025/026, visitor_screen_audit, uat_journey dahil). Backend `vitest`: 10 dosya / **54 test geçti** | **BAŞARILI** |
| U-15 | **TALEP-041 için regresyon testi** | Sıralamayı koruyan otomatik test | Değişen dosyalar için yeni test **yok** (pipeline "FIX+TEST KAPISI" uyarısı doğrulandı) | **BAŞARISIZ (Eksik Test)** |
| U-16 | TALEP-041 kayıt durumu | Sprinte alınmış / işleme geçmiş durum | `studio.db`: `TALEP-041 = DEGERLENDIRMEDE`; panoda TALEP-041 adına açılmış görev yok (iş S30-T1 altında yapıldı) | **BAŞARISIZ (İzlenebilirlik)** |
| U-17 | Müşteriye ETA bildirimi | Planlanan tamamlanma tarihi kayda geçmiş | `musteri_talepleri.md` TALEP-044 kaydı `⏳ Beklemede`, Studio Yetkilisi notu ve ETA satırı yok | **BAŞARISIZ (İzlenebilirlik)** |

**Özet:** 14 BAŞARILI · 3 BAŞARISIZ (hiçbiri işlevsel bozulma değil; 1 eksik test + 2 kayıt/bildirim eksiği).

---

## 3. Kanıt Notları (Canlı Ölçüm)

- **Menü sıralaması (kritik kanıt):** Chromium ile `/` açıldı, "Tüm Operatörler" tıklandı, listedeki 179 kaydın tamamı `(sayı)` etiketiyle okundu ve monoton azalan olduğu programatik olarak doğrulandı. Liste sonu: `… Porty(5) → Z-Şarj(5) → Ekojet(4) → Tr Charge(3) → Ecojet(1)`.
- **Veri kaynağı gerçeği:** `GET /api/v1/operators` (3001 ve 3000 proxy) 180 kayıt döndürüyor ancak `station_count` alanı **API'de `null`**. Sıralama, istemcideki `data/operators.json` tabanıyla birleştirme sonucu elde edilen sayılarla yapılıyor. Canlıda doğru görünüyor; ancak sıralamanın doğruluğu istemci tarafındaki statik sayıma bağımlıdır (bkz. Sapma S-1).
- **Harita:** Türkiye görünümünde kümeleme daireleri, Kadıköy zoom 16 görünümünde tekil operatör pinleri (Z/W/V/O amblemleri) ekran görüntüleriyle teyit edildi. Viewport istekleri `bbox` + `zoom` ile doğru üretiliyor.
- **Tek konsol hatası:** `404 https://demotiles.maplibre.org/font/...pbf` — harici MapLibre demo glyph kaynağı. Uygulama kodundan kaynaklanmıyor, reddetme eşiğine girmiyor.

---

## 4. Tespit Edilen Sapmalar ve Kalıcı Riskler

| Kod | Bulgu | Etki | Tavsiye |
|---|---|---|---|
| **S-1** | `GET /api/v1/operators` yanıtında `station_count = null`; sıralama istemcideki statik `operators.json` sayımlarına bağlı | Veritabanı sayıları değiştiğinde menü sırası eskiyebilir; API tüketen ikinci istemci (Flutter) aynı sırayı üretemez | `station_count` alanı backend'de `station` tablosundan hesaplanıp yanıta eklenmeli; sıralama sunucu tarafında da garanti edilmeli |
| **S-2** | TALEP-041 sıralaması için otomatik regresyon testi yok | Sonraki bir düzenleme sıralamayı sessizce alfabetiğe döndürebilir (TALEP-024'ün korunma deseni gibi bir bekçi gerekli) | `tests/talep-041.spec.ts`: "ilk kayıt en yüksek istasyon sayılı olmalı + liste monoton azalan" assert'i eklenmeli |
| **S-3** | `/operatorler` sayfası üst menüde bağlantılı değil | Müşterinin talep ettiği dizin ekranı yalnızca doğrudan URL ile bulunabiliyor | Header navigasyonuna "Operatörler" bağlantısı eklenmeli |
| **S-4** | `GET /api/v1/stations/{slug}/deep-link` → 404 (istemci bu çağrıyı sessizce yutuyor) | Ön yüz derin bağlantıyı yalnızca detay yanıtındaki gömülü `deep_link` alanından alabiliyor | Rota eklenmeli veya istemcideki ölü çağrı kaldırılmalı (TALEP-044 dışı, ayrı kayıt önerilir) |
| **S-5** | `zoom=10` isteğinde kümeleme yerine 2000 tekil istasyon dönüyor (kümeleme eşiği fiilen `zoom < 10`) | PO-201 "zoom < 11 → küme özeti, dizi ≤ 250" kriteriyle çelişiyor; geniş görünümde gereksiz yük | Eşik `zoom < 11` olarak düzeltilmeli (TALEP-044 dışı, mevcut/önceki sapma) |
| **S-6** | API'de 180, arayüzde 179 operatör (`rssarj-412` yalnızca API'de türetilmiş mükerrer kayıt); listede iki ayrı `Ecojet(1)` görünüyor | TALEP-042 ile hedeflenen ortam eşliği tam değil; mükerrer marka gözüküyor | Operatör normalizasyonu (slug tekilleştirme) veri hattında ele alınmalı |

---

## 5. Karar (VERDICT)

**VERDICT: KOŞULLU KABUL (CONDITIONAL PASS)**

- **İşlevsel eksen KABUL:** Müşterinin öncelik verilmesini istediği davranış canlıda çalışıyor. "Tüm Operatörler" menüsü ve yeni `/operatorler` dizini, istasyon sayısına göre çoktan aza (eşitlikte Türkçe alfabetik) sıralanıyor; 179/179 kayıtta doğrulandı. Harita kümeleme, 500+ pin yükü, istasyon detay paneli, eksik veri rozeti ve pano fallback akışları bozulmadı. Konsolda `TypeError` ve uygulama akışlarında istenmeyen `400` **yok**; 113 deterministik test (59 web + 54 backend) geçiyor. Bu nedenle görev **REDDEDİLMEMİŞTİR**.
- **Kabul için kapatılması gereken 3 koşul:**
  1. `TALEP-041` kaydının durumu güncellenmeli (Değerlendirmede → Çözüldü/Geliştiriliyor) ve hangi sprint/görevde karşılandığı kayda geçmeli; aksi halde müşteri talebinin karşılandığı sistemden okunamıyor.
  2. Müşteriye tahmini tamamlanma / teslim bildirimi `musteri_talepleri.md` TALEP-044 kaydına Studio Yetkilisi notu olarak yazılmalı (talebin açık beklentisi budur).
  3. Sıralamayı koruyan regresyon testi eklenmeli (S-2).
- **Aşağı akış için bağlayıcı aksiyon:** S-1 (backend `station_count`) bir sonraki veri/backend görevine alınmalı; S-4 ve S-5 ayrı talep/issue olarak kayıt altına alınmalı — bu raporla birlikte otomatik talep açılması gerekmez, çünkü ikisi de TALEP-044 kapsamı dışıdır ve kullanıcıya yansıyan bir kesinti üretmemektedir.

---

## 6. Yeniden Üretim Komutları

```bash
# Servis doğrulaması
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/operatorler

# Kümeleme ve pin yükü
curl -s "http://127.0.0.1:3001/api/v1/stations?bbox=25.5,35.5,45.0,42.5&zoom=6"   # clusters
curl -s "http://127.0.0.1:3001/api/v1/stations?bbox=28.5,40.8,29.5,41.2&zoom=11"  # 2000 istasyon

# Hatalı girdi (RFC 7807 / 400 beklenir)
curl -s -i "http://127.0.0.1:3001/api/v1/stations?bbox=29.5,41.2,28.5,40.8&zoom=11"

# Regresyon süitleri
cd workspace/src/frontend && npx vitest run     # 59 test
cd workspace/src/backend  && npm test           # 54 test
```
```
