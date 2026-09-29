# Studio Yetkilisi Çözüm Planı: TALEP-052

> **Talep:** [TALEP-052] FilterChips.vue '~/composables/useClickOutside' modülünü bulamıyor  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-28 23:43  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Müşteri bildirimi (ACİL): Harita filtre bileşeni modül çözümleme hatası veriyor.

Hata mesajı:
Cannot find module '~/composables/useClickOutside' imported from '/Users/cihan/PROJECT/elektriklioto-gemini/workspace/src/frontend/components/map/FilterChips.vue'.
- If you rely on tsconfig.json's "paths" to resolve modules, please install "vite-tsconfig-paths" plugin to handle module resolution.
- Make sure you don't have relative aliases in your Vitest config. Use absolute paths instead. Read more: https://vitest.dev/guide/common-errors

Müşteri notu: Acil düzeltilmesi isteniyor.

Ekip notu: TALEP-049 (SearchInput.vue './geoSearch' modülü bulunamıyor) ile aynı kökenli olabilir; eksik/taşınmış composable dosyaları veya '~' alias çözümleme (vite/vitest tsconfig paths) yapılandırması birlikte incelenmeli. Müşteriden hatanın kapsamı (uygulama tamamen açılmıyor mu / yalnızca filtre alanı mı) ve ortam bilgisi (canlı / test çalıştırması) teyidi bekleniyor.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

**1. Kök Neden:** `FilterChips.vue`, `~/composables/useClickOutside` yolunu import ediyor, ancak bu dosya `composables/` klasöründe mevcut değil (klasörde `useChangelog`, `useOperators`, `useToast` vb. var, `useClickOutside` yok) — TALEP-049'daki `geoSearch.ts` durumuna çok benziyor: o dosya da composables'da değil, `components/map/geoSearch.ts` altında bulunuyor. Yani bu, tek seferlik bir yazım hatası değil, geçtiğimiz refactor/taşıma sürecinde composable dosyalarının bir kısmının hedef klasöre taşınmadığı veya hiç oluşturulmadığı sistematik bir eksiklik; `~` alias çözümlemesi (tsconfig/vite paths) muhtemelen doğru çalışıyor, sorun dosyanın kendisinin yokluğu.

**2. Kritik Riskler:** Önce dosyanın gerçekten eksik mi yoksa yanlış konumda mı olduğunu doğrulayın (grep ile `useClickOutside` tanımı repo genelinde aranmalı) — TALEP-049'da olduğu gibi başka bir yerde duruyor olabilir, bu durumda çözüm "taşıma", "yeniden yazma" değil. İkisi aynı kökten geliyorsa aynı taşıma/commit'te kaybolmuş başka composable'lar da olabilir — sadece bu iki dosyayla sınırlı kalmayıp tüm `~/composables/*` importlarını derleme hatası almadan doğrulayın (ör. `vue-tsc`/build ile). Build hatası tüm uygulamayı açılmaz hale getirebileceğinden (TALEP-049'da olduğu gibi) müşteriden istenen kapsam teyidini (sadece filtre alanı mı, tüm SPA mı) almadan "acil" etiketiyle aceleyle patch geçmeyin; canlıya çıkmadan önce mutlaka local build+smoke test yapın.

**İlgili Dosyalar & Modüller:**
   - `scripts/`
   - `server-scripts/`
   - `curl_input.txt`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

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
