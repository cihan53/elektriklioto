TALEP-042'nin ne olduğunu ve canlı servislerin durumunu kontrol ediyorum.Servisler ayakta. TALEP-042'nin içeriğini bulmam gerekiyor — plan dosyası yok, diğer kaynaklara bakıyorum.Backend 180 operatör dönüyor — TALEP-042 düzeltmesi yerinde görünüyor. Mevcut rapor formatına ve canlı denetim script'ine bakıyorum.Rapor formatı için daha eski bir geçmiş sürüme bakıyorum ve audit script'ini koşturuyorum.Audit script 6/6 geçti. Şimdi rol kapsamındaki detaylı canlı denetimleri yapıyorum: küme sayıları, pin sayısı, istasyon detayı, deep-link ve operatör eşliği.Operatörlerde `station_count` alanı None dönüyor. İstasyonların operatör eşliğini ve eksik operatörün çözüldüğünü doğruluyorum.Zoom 12'de tam Türkiye BBox 400 döndü — hata gövdesini ve geçerlilik sınırını inceliyorum.Operatör eşliği tam: 2000 istasyonun tamamı adlandırılmış operatöre çözümleniyor. Şimdi istasyon detayı, deep-link ve SSR sayfaları doğruluyorum.Kritik bulgu: API detayı 200 dönüyor ama SSR sayfa "İstasyon Kaydı Bulunamadı" render ediyor. Sayfanın veri çekme mantığını inceliyorum.Sayfa SSR'da `/api/v1/stations/{slug}` çekiyor. Port 3000'in dev mi prod mu çalıştığını ve SSR fetch'in neden boş döndüğünü kontrol ediyorum.Port 3000 `nuxt dev` çalışıyor ve proxy browser tarafında çalışıyor (180 operatör geldi). Ama SSR sayfaları veriyi alamıyor. Hatanın kaynağını araştırıyorum.SSR sayfalar veri çekemiyor — bu gerçek bir kusur. Son bir doğrulama: harita pinlerinin DOM marker mı canvas mı olduğunu ve detay panelinin açılıp açılmadığını pin koordinatına tıklayarak test ediyorum.Pin tıklamayı doğrulamak için istasyon koordinatının ekran pikselini hesaplayıp oraya tıklatacağım. Önce harita state'inin nasıl açıldığını görelim.Arama yalnızca yüklenen viewport verisinde çalışıyor (zoom 6'da istasyon listesi boş — küme modu). Pin tıklama testini gerçek koordinat projeksiyonuyla yapıyorum.`?city=istanbul` flyTo tetiklenmedi ve küme verisi döndü. Küme tıklama → zoom davranışını adım adım test ediyorum.Son kontrol: `/zes` operatör sayfası istemci tarafında hydration sonrası istasyonları yüklüyor mu, yoksa SSR hatası kalıcı mı?Son kanıt: haritadaki operatör dropdown'ının canlıda kaç operatör gösterdiğini kontrol ediyorum (TALEP-042'nin müşteri gözüyle doğrulanması).Kritik nokta: `fetchOperators` `length >= 170` ise API'yi hiç çağırmıyor — bundle'da 179 sabit. API'deki 180. operatörün hangisi olduğunu ve UI'a ulaşıp ulaşmadığını karşılaştırıyorum.Tüm kanıtlar toplandı. TALEP-042 düzeltmesi backend'de doğrulandı ancak müşteri gözüyle UI tarafında iki engelleyici bulgu var. Raporu üretiyorum.

# UAT Kabul Raporu — TALEP-042 (Sprint S29)

> **Belge:** `workspace/docs/uat_kabul_raporu.md`
> **Görev:** TALEP-042 — Müşteri Kabulü & UAT Doğrulama Denetimi
> **Ortam:** Canlı dev — `http://127.0.0.1:3000` (Nuxt 3 dev + Nitro devProxy), `http://127.0.0.1:3001` (Fastify API, PostGIS)
> **Yöntem:** Headless Chromium (Playwright-core) + canlı HTTP istekleri; izole birim testi / mock kullanılmadı
> **Tarih:** 2026-09-28

## 1. Genel Karar

**VERDICT: REJECTED — TALEP-042 kabul kriteri müşteri yüzeyinde karşılanmıyor.**

Backend düzeltmesi doğrulandı (`/api/v1/operators` artık **180** operatör dönüyor, türetilen `rssarj-412` / "Rsşarj" dahil; 2000 istasyonluk örneklemde çözümlenemeyen `operator_id` = 0). Ancak frontend operatör menüsü API'yi hiç çağırmıyor — `useOperators.fetchOperators()` içindeki `if (operators.value.length >= 170) return` erken çıkışı, bundle'daki 179 kayıtlık `data/operators.json` yüzünden API isteğini sonsuza dek kısa devre yapıyor. Sonuç: müşterinin şikâyet ettiği semptom (canlıda 179 görünmesi) **aynıyla devam ediyor**; 180. operatör "Tüm Operatörler" menüsünde ve operatör aramada asla listelenmiyor.

Ayrıca ikinci, görev kapsamını aşan ancak kabulleri bloke eden kritik bir kusur tespit edildi: **SSR katalog/detay sayfaları verisiz render ediliyor** (bkz. §4-BUG-02). `/zes` sayfası "aktif istasyon kaydı işlenmemiştir", geçerli bir istasyon sayfası `/trugo/trugo-tsyd-istanbul` ise "İstasyon Kaydı Bulunamadı" gösteriyor — TALEP-042'nin "istasyonu olan her operatör sitede adıyla listelenmeli" kabulü bu yüzeyde de kırılıyor.

## 2. UAT Senaryo Sonuç Tablosu

| ID | Senaryo (Görev Adımı) | Beklenen | Ölçülen | Sonuç |
|---|---|---|---|---|
| UAT-01 | Canlı haritaya bağlanma (3000 + 3001) | HTTP 200, HTML + API UP | `/` 200, `/health/sources` UP, `x-service-type: e-Mobility Assistant / EMP Candidate` | **GEÇTİ** |
| UAT-02 | Türkiye geneli küme daireleri (zoom < 11) | cluster sayısı > 0 | `zoom=6` → `type:"clusters"`, **81 küme** (İstanbul kümesi `cluster-34-0` = 4525 istasyon) | **GEÇTİ** |
| UAT-03 | Küme tıklama → zoom 10-12 uçuşu | Kademeli zoom + pin geçişi | Kümeye tıklama zoom 6→9→11 ilerletti; her adımda yeni BBox sorgusu tetiklendi | **GEÇTİ** |
| UAT-04 | Büyükşehir pin yoğunluğu | 500+ istasyon pini | İstanbul `zoom=11` BBox → `type:"stations"`, **2000 pin** (soket/güç/operatör alanlı) | **GEÇTİ** |
| UAT-05 | Pin tıklama → detay paneli | Panel açılır; ad, operatör, EPDK no doğru | Zoom 15'e uçuş + pin tıklaması → panel açıldı: **TSYD / ŞRJ/10313 / Trugo / CCS2 / 180 kW** | **GEÇTİ** |
| UAT-06 | Derin bağlantı / pano fallback | Kopyalama veya yönlendirme | "Operatör Web Sitesine Git ↗" tıklandı → **`ŞRJ/10313` panoya kopyalandı**, yönerge toast'ı tetiklendi (headless'te `window.open` popup'ı gözlenemedi) | **GEÇTİ** |
| UAT-07 | Konsol `TypeError` / ağ `400` taraması | Sıfır kritik hata | TypeError yok; API'de 400/500 yok; yalnızca `demotiles.maplibre.org` font PBF 404 (kozmetik) | **GEÇTİ** |
| UAT-08 | **TALEP-042 — operatör listesi eşliği** | Canlı = yerel = 180; istasyonu olan her operatör adıyla listeli | API 180 ✓ ancak UI menüsü bundle 179'da kilitli — `rssarj-412` müşteriye görünmüyor | **KALDI** |
| UAT-09 | Operatör/istasyon SSR sayfaları | Liste ve detay verisi render edilir | `/zes` 0 kart; `/trugo/trugo-tsyd-istanbul` "İstasyon Kaydı Bulunamadı" | **KALDI** |

## 3. TALEP-042 Doğrulama Detayı

| Kontrol | Sonuç |
|---|---|
| `GET :3001/api/v1/operators` → kayıt sayısı | **180** (öncesi 179) ✓ |
| `GET :3000/api/v1/operators` (Nitro proxy) | **180** ✓ |
| API−bundle farkı | API'de fazla: `rssarj-412` ("Rsşarj"); bundle'da fazla: yok |
| 2000 istasyonluk İstanbul örneklem: `operator_id` çözülemeyen | **0** |
| Boş `operator_name` / yetim `operator.slug` | **0 / 0** |
| UI operatör menüsü kaynağı | `data/operators.json` (179) — `fetchOperators` ≥170 eşiğinde API'ye hiç çıkmıyor; Playwright oturumunda `/operators` çağrısı **hiç gözlenmedi** |

**Karar:** Backend tarafı doğru; kabul kriterinin müşteri yüzeyi ayağı (`Tüm Operatörler` menüsü, operatör arama) eksik. `useOperators.ts` satır ~12'deki `length >= 170` kısa devresi kaldırılmalı veya `data/operators.json`'a `rssarj-412` eklenip bundle güncellenmeli — tercihen ikisi (tek doğruluk kaynağı API olmalı).

## 4. Tespit Edilen Kusurlar

### BUG-01 (KALDI — TALEP-042 kapsamı): Operatör menüsü bundle'da sabitlendi
- **Yeniden üretme:** Canlı UI'da "Tüm Operatörler" açılır menüsü → başlık "179 Marka"; `Rsşarj` araması sonuçsuz.
- **Kök neden:** `composables/useOperators.ts` — `useState` bundle JSON ile 179 doluyor; `fetchOperators()` `>= 170` koşulunda erken dönüyor.
- **Etki:** İstasyonu olan türetilmiş operatör (`rssarj-412`) sitede yok; müşteri bildirimi geçerli.

### BUG-02 (KALDI — yeni kritik kusur, ayrı talep önerilir): SSR sayfaları "404 Page not found" nedeniyle boş
- **Yeniden üretme:** `curl :3000/trugo/trugo-tsyd-istanbul` → `<title>İstasyon Bulunamadı</title>`; `/istanbul/sarj-istasyonlari` → "0 istasyon"; `/zes` → boş kart grid.
- **Kök neden (kanıt):** Nuxt SSR payload'ında `_errors` içinde `"[GET] \"/api/v1/stations/trugo-tsyd-istanbul\": 404 Page not found"`. `useFetch` göreli `/api/v1` ile SSR'da Nitro uygulamasına **içsel** çağrı yapar; `nitro.devProxy` yalnızca listener katmanında çalıştığından SSR çağrısı proxy'yi atlayıp Nuxt router'a düşer → 404. Hydration sonrası yeniden çekim de yok (hata payload'a gömülü), sayfa kalıcı boş kalır.
- **Etki:** Tüm SEO katalog yüzeyi (`/{city}`, `/{city}/{district}`, `/{operator}`, `/{operator}/{slug}`) dev ortamında işlevsiz; PO-501/UX-FLOW-06 ihlali. Prod'da `NUXT_PUBLIC_API_BASE` mutlak URL ise geçerli olabilir — doğrulanmalı (AGENTS.md dev↔prod eşlik kuralı).

### Gözlem (kusur değil)
- `GET /api/v1/stations/{slug}/deep-link` → 404; ancak detay yanıtı `deep_link` alanını gömülü taşıyor ve UI clipboard fallback'i doğrulandı. Kullanılmayan uç nokta; temizlik önerilir.
- Zoom-farkındalı BBox tavanı (`getMaxSpanForZoom`) kasıtlı DoS koruması: `zoom=12`+tam Türkiye → 400 beklenen davranış.
- demotiles font 404 — harita karo sağlayıcısı demo kalıntısı; kozmetik.

## 5. Kapı Özeti

| Kapı | Durum |
|---|---|
| Kümeleme / zoom / pin sayısı | GEÇTİ (81 küme; z11'de 2000 pin) |
| Pin→detay→deep-link yolculuğu | GEÇTİ (ŞRJ/10313 panoda) |
| Konsol/ağ sağlığı | GEÇTİ (TypeError=0, API 400=0) |
| **TALEP-042 müşteri yüzeyi** | **KALDI** (BUG-01) |
| SEO/SSR katalog bütünlüğü | **KALDI** (BUG-02) |

> **Sonuç:** TALEP-042 backend çözümü onaylandı ancak müşteri kabulü için UI tarafının da 180 operatörü göstermesi şart — **BUG-01 kapatılmadan görev REDDEDİLİR.** BUG-02 ayrı bir müşteri talebi olarak kayda geçirilmelidir.

> **Varsayım:** Üretim (elektriklioto.com) yapılandırmasında `NUXT_PUBLIC_API_BASE` mutlak `https://api.elektriklioto.com` olarak tanımlıysa BUG-02 yalnızca dev ortamını etkiler; cPanel ortamı bu oturumdan doğrulanamadığı için bu bir varsayım olarak bırakılmıştır.
