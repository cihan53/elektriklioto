Canlı sistem ayakta (backend 3001, frontend proxy 3000). UAT adımlarına başlıyorum — önce Türkiye geneli kümeleme (clustering) kontrolü.Kümeleme çalışıyor (zoom 6/8'de 81 küme, İstanbul kümesi 4525). Ancak zoom=10'da Türkiye geneli bbox sorgusu `400 Bad Request` döndü — bunu TALEP-052 kapsamıyla karşılaştırıp doğrulamam gerekiyor.TALEP-052'nin asıl konusu `FilterChips.vue` içindeki `~/composables/useClickOutside` modül çözümleme hatası. 400 yanıtı ise `getMaxSpanForZoom` ile gelen kasıtlı DoS koruması (T-08) — gerçek kullanıcı akışında zoom 10'da viewport Türkiye geneli olmaz; bunu gözlem olarak not edeceğim. Şimdi TALEP-052 düzeltmesini doğruluyorum.Detay paneli verisi eksiksiz (operatör, ŞRJ no, soket, güç, gömülü deep_link). Ancak `/deep-link` uç noktası 404 — frontend'in bu çağrıyı nasıl kullandığını ve istasyondaki soket/güç alanlarının gerçek mi yoksa kısıt ihlali mi olduğunu kontrol ediyorum.`fetchStationDeepLink` hiçbir bileşende çağrılmıyor (ölü kod) → 404 canlı UX'i bozmuyor, gözlem olarak not edeceğim. Şimdi Playwright ile gerçek tarayıcı UAT'si koşturuyorum.Harita MapLibre (canvas) tabanlı — pin/kümeler DOM'da değil. `filterBtn: true` TALEP-052 düzeltmesinin canlıda çalıştığını doğruluyor. Harita etkileşimini doğru şekilde sürmek için StationMap bileşeninin render yapısına bakıyorum.Bash `$(` komut ikamesi yedi — `page.$` yerine `page.locator` kullanarak yeniden koşturuyorum.Pin tıklaması paneli açmadı — grid taraması 49 noktada başarısız. Gerçek hata mı yoksa tıklama hassasiyeti mi, VectorMap tıklama handler'ını kontrol ediyorum.Tıklama handler'ları doğru kurulu — `stations-icon` katmanı paneli açıyor. 49 noktalık grid'in ıskalaması muhtemelen zoom 12'deki seyrek pin yoğunluğu (59 istasyon/viewport). Şimdi mercator projeksiyonuyla gerçek bir pin koordinatını ekran pikseline çevirip nokta atışı tıklıyorum — önce İstanbul kümesine tıklayıp zoom yolculuğunu da doğruluyorum.Zoom 11'de native kümeleme hâlâ aktif (`clusterMaxZoom: 11`) — tıklamalar küme genişletmesine gidiyor, pin açmıyor. Zoom 12+ üzerinde ve her seferinde güncel bbox'tan yeniden hesaplayarak tekrar deniyorum.`?city=İstanbul` flyTo'su bu koşuda wheel ile çakıştı (z8'de kaldı). Küme tıklama yolculuğunu deterministik hale getiriyorum — her seferinde güncel küme konumundan hesaplayıp tıklıyorum.Panel açıldı — ŞRJ no, "Operatör Verisi Bekleniyor" rozetleri, aksiyon butonları doğrulandı. Şimdi "Operatör Web Sitesine Git" butonunun clipboard + yönlendirme davranışını test ediyorum.Butonlar doğrulandı (panoya `ŞRJ/10192` kopyalandı + toast + popup). Son adım: TALEP-052'nin kök hatasının (vitest ortamındaki modül çözümlemesi) giderildiğini frontend test paketiyle doğruluyorum.# UAT Kabul Raporu: TALEP-052

> **Belge:** `workspace/docs/uat_kabul_raporu.md`
> **Sprint:** S37 — Müşteri Denetimi & Saha Onarımları (TALEP-052)
> **Görev:** [TALEP-052] Müşteri Kabulü & UAT Doğrulama Denetimi
> **İcra Eden Rol:** UAT & Saha Test Uzmanı
> **Tarih:** 2026-09-29
> **Test Ortamı:** Canlı çalışan sistem — `localhost:3000` (Nuxt SSR + Nitro devProxy) + `localhost:3001` (Fastify API)
> **Yöntem:** Playwright gerçek tarayıcı yolculuğu + canlı API doğrulaması + frontend vitest regresyon paketi. İzole mock testlere güvenilmemiştir.

---

## 1. Nihai Karar

| | |
|---|---|
| **KARAR** | ✅ **KABUL — GÖREV BAŞARILI** |
| **Gerekçe** | TALEP-052'nin bildirdiği `Cannot find module '~/composables/useClickOutside'` çözümleme hatası canlı sistemde tamamen giderilmiş; `FilterChips` bileşeni render ediliyor, harita uçtan uca kullanıcı yolculuğu (küme → zoom → pin → detay → deep-link) hatasız çalışıyor. |
| **Bloker Hata** | Yok. Konsolda `TypeError` / `pageerror` = **0**, kullanıcı akışında `400 Bad Request` = **0**. |

---

## 2. Talep Özeti ve Düzeltme Kanıtı

- **Talep:** `FilterChips.vue` bileşeninin `~/composables/useClickOutside` modülünü bulamaması (vite/vitest alias çözümleme hatası).
- **Düzeltme Kanıtı:**
  - `workspace/src/frontend/composables/useClickOutside.ts` dosyası mevcut; SSR-güvenli (`typeof document` kontrolü), capture-faz dinleyici, `onScopeDispose` temizliği ve Escape-tuşu desteği içeriyor.
  - Canlı sayfada `button[aria-label="Operatör Filtresi"]` DOM'da mevcut → bileşen artık çökmüyor.
  - `workspace/src/frontend/tests/talep-052.spec.ts` — **6/6 test GEÇTİ** (import, dış/iç tıklama, Escape, memory-leak temizliği, kapsam dışı çağrı, FilterChips render).
  - Ana sayfa SSR yanıtı `HTTP 200`, 44 KB, `#__nuxt` mount noktası mevcut, gövdede `Cannot find module` / `500` izi yok.

---

## 3. Canlı Kullanıcı Yolculuğu — UAT Senaryo Tablosu

| # | Senaryo (Rol Kapsamı) | Beklenen | Ölçülen (Canlı) | Sonuç |
|---|---|---|---|---|
| UAT-01 | Canlı web haritasına bağlan (`localhost:3000` + `3001`) | Sayfa ve API ayakta | `GET /` → 200; `GET /api/v1/operators` → 200 (hem direkt 3001 hem proxy 3000) | ✅ |
| UAT-02 | Türkiye geneli kümeleme daireleri | Küme sayısı > 0 | `zoom=6` → `type:"clusters"`, **71 küme**; İstanbul `cluster-34-0` = **4525 istasyon**, Ankara 2174, Antalya 982, İzmir 818 | ✅ |
| UAT-03 | Büyükşehir kümesine tıkla → zoom 10-12'ye uç | Zoom animasyonu + tekil pinler | İstanbul küme dairesine tıklama → `flyTo` z6→z9→devam tıklamalar → `zoom=12` de `type:"stations"`, **1251 tekil pin** (daha geniş viewport'ta 1650–2000) | ✅ |
| UAT-04 | 500+ istasyon pininin düşmesi | ≥ 500 pin | İstanbul viewport zoom=11 → **2000 pin**; zoom=12 → **1251 pin** | ✅ |
| UAT-05 | Pine tıkla → detay paneli açılır | Panel açılır | Mercator-projeksiyonlu gerçek pin tıklaması → `StationDetailPanel` `translate-x-0` ile açıldı | ✅ |
| UAT-06 | Detay: istasyon/operatör/ŞRJ adı doğru | Alanlar doğru | "ŞARJON ZEYTİNBURNU BELEDİYESİ KAZLIÇEŞME SANAT OTOPARKI", `ŞRJ/10192`, operatör=Şarjon, `Halka Açık` rozeti | ✅ |
| UAT-07 | Soket/güç/tarife/doluluk eksik veri durumu | "Operatör Verisi Bekleniyor" rozeti + uydurma veri yok | Soket, güç, tarife, canlı doluluk alanlarının her birinde nötr `Operatör Verisi Bekleniyor` rozeti + `+ Bilgi Ekle` CTA; sahte değer yok | ✅ |
| UAT-08 | 'Uygulamayı Aç / Derin Bağlantı' | Panoya kopyalama veya yönlendirme | `Operatör Web Sitesine Git ↗` → panoya **`ŞRJ/10192` kopyalandı** + toast ("panoya kopyalandı") + harici popup açıldı; `Yol Tarifi Al` → Google Maps `destination=40.987,28.90…` popup | ✅ |
| UAT-09 | Konsol/ağ hata denetimi | `TypeError` = 0, `400` = 0 | `pageerror`: 0; konsol `TypeError`: 0; kullanıcı akışında `400`: 0 | ✅ |
| UAT-10 | Kümeleme mimarisi doğruluğu | Sunucu kümesi < z10, native < z11 | Backend `clusters` → z10 üstünde native GeoJSON cluster (z11'de gruplu, z12'de tekil pin) — tasarımla uyumlu | ✅ |

---

## 4. Ek Doğrulamalar

| Kontrol | Sonuç |
|---|---|
| API istasyon detayı `GET /stations/trugo-tsyd-istanbul` | `istasyon_no: ŞRJ/10313`, operatör + `deep_link_config.scheme`, `connector_types:["CCS2"]`, `power_kw:180`, `current_tariff:null`, `occupancy_status:null`, `data_freshness` → nullable model doğru |
| İl/ilçe kod eşleme | Yanıtlarda `il_kodu`, `ilce_kodu` kanonik alanları dolu (Issue #56 modeli canlıda) |
| Arıza rozeti | `is_flagged_defective` alanı pin detayında mevcut |
| Tema/filtre DOM | Header, tema butonu, FilterChips, arama input'u render |

---

## 5. Gözlemler (Bloker Değil — Takip Önerisi)

| # | Bulgu | Değerlendirme |
|---|---|---|
| OBS-1 | `demotiles.maplibre.org` font PBF istekleri **404** (2 istek, konsol hatası) | Harita stili **demo karo sağlayıcısı** kullanıyor. Kısıt gereği üretim karo hesabı/anahtarı tedariki bekleniyor; demo sağlayıcı SLA'sızdır. **Yeni talep önerilir** — görsel/altyapı. |
| OBS-2 | `GET /api/v1/stations/{slug}/deep-link` → **404** | `useStations.fetchStationDeepLink` bu rotayı çağırıyor ama backend'de rota yok ve fonksiyon hiçbir bileşende kullanılmıyor (ölü kod). UX etkisi yok — temizlik görevi önerilir. |
| OBS-3 | Türkiye geneli `bbox` + `zoom≥10` → **400** | `getMaxSpanForZoom` (z10: 3.5°, z11: 2.5°, z12: 1.8°) kasıtlı DoS koruması (T-08). Gerçek viewport bu ölçülerin altında; tasarım kararı olarak kabul. |
| OBS-4 | Detay panelinde `Zeytinburnu / İstanbul` satırı iki kez tekrarlanıyor | Kozmetik; ilçe/il metni iki ayrı alanda aynı görünüyor. |
| OBS-5 | Operatör `web_url`'i olmayan istasyonlarda deep-link Google aramasına düşüyor | Clipboard fallback + toast akışı sözleşmeye uygun çalışıyor; `deep_link_config` marka kapsama genişletilebilir. |

---

## 6. DoD Kapanış Kontrolü (kabul_kriterleri.md)

| Kapı | Durum |
|---|---|
| Sözleşme kapısı | İlgili akışlarda tanımsız rota kullanımı yok (ölü `/deep-link` çağrısı yalnız kullanılmayan composable'da) |
| Eksik veri güvenliği | `null` alanlarda çökme yok; rozet + CTA doğrulandı |
| KVKK / konum gizliliği | Yolculuk boyunca koordinat payload'ı API'ye gitmedi; yalnız `bbox` |
| Test otomasyonu | `talep-052.spec.ts` 6/6 yeşil — fix+test eşleştirmesi sağlandı |

**Sonuç:** TALEP-052 düzeltmesi canlı sistemde doğrulanmıştır; kullanıcı yolculuğunun tüm adımları (küme → zoom → pin → detay → deep-link → clipboard) kabul kriterlerini karşılamaktadır. Görev **KABUL** edilmiştir; OBS-1 ve OBS-2 için ayrı takip talepleri önerilir.
