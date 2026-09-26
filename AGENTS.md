# AGENTS.md — elektriklioto-gemini

Bu proje Digital Software Studio (`studio_engine.py`) ile geliştirilir. Aşağıdaki
notlar saha deneyiminden öğrenilmiş kurallardır; ajanlar ve insanlar için geçerlidir.

## "müşteri:" ile Başlayan İstekler (Müşteri Talep Protokolü)

Kullanıcıdan gelen prompt `"müşteri:"` (veya `müşteri:`) ile başlıyorsa:
1. **Çözüme Girişme:** Doğrudan kod yazmaya veya hatayı/isteği o anda çözmeye kalkışma.
2. **Talebi Düzelt, Netleştir & İnsan Anlatısıyla Detaylandır:**
   - Müşterinin kısa/ham ifadesini al, düzelt ve bir son kullanıcı / araç sahibi perspektifinden netleştir.
   - Ne görüldü, ne bekleniyordu, eksik veya aksayan yön nedir sorularını yanıtlayan **doğal, akıcı bir insan anlatısı (kullanıcı deneyimi hikayesi)** olarak detaylandır.
   - **Teknik detayları asgari düzeyde tut:** Aşırı teknik jargondan ve kod detaylarından kaçın. Çünkü Digital Software Studio mimarisi (`scripts/studio_yetkilisi.py`, `karar_verici_triage.py`) bu anlatıyı algılayıp mimari analizi ve teknik çözüm planını kendisi çıkaracaktır.
3. **Müşteri Talebini Script ile Oluştur:**
   - Komutu çalıştırarak talebi sisteme işle:
     ```bash
     python3 /Users/cihan/PROJECT/elektriklioto-gemini/scripts/musteri_talepleri.py --yeni --tur <HATA|ISTEK|UX|VERI> --oncelik <KRITIK|YUKSEK|NORMAL|DUSUK> --sayfa "<ilgili_sayfa>" --baslik "<kısa_net_başlık>" --aciklama "<düzeltilmiş_insan_anlatısı>"
     ```
   - Bu araç otomatik olarak dual-write ile `studio.db`, `workspace/docs/musteri_talepleri.json`, `workspace/docs/musteri_talepleri.md`, GitHub Issue ve çözüm planını (`workspace/docs/cozum_planlari/TALEP-XXX.md`) oluşturur.
4. **Bilgilendirme:** Kullanıcıya talebin doğrudan çözülmediğini, düzeltilip detaylandırılarak kaydedildiğini belirterek oluşturulan `TALEP-XXX` numarasını, başlığını ve linkini raporla.

## Dev ↔ Prod API Eşliği (Kritik)

`workspace/src/frontend/nuxt.config.ts` içinde `runtimeConfig.public.apiBase`
varsayılanı **göreli** yoldur: `/api/v1`.

- **Prod:** cPanel `.htaccess` `/api` isteklerini backend'e proxy'ler → göreli yol çalışır.
- **Dev (`nuxt dev`):** `nitro.devProxy` `/api/v1` → `http://127.0.0.1:3001/api/v1`
  eşlemesini yapar. Bu blok silinirse/bozulursa tüm `/api/v1/*` istekleri Nuxt
  router'a düşer ve 404 olur ("Vue Router warn: No match found").

Kural: `apiBase`, `.htaccess`, `nuxt.config`, `docker-compose`, `*.env` gibi
dosyalara dokunan her değişiklik **dev VE prod path'i birlikte** doğrulanmalıdır.
Nitro devProxy eşleşen prefix'i kırpar — hedefe `/api/v1` yazılmasının sebebi budur.

## Doğrulama Komutları

```bash
# Canlı ortam
./canli.sh                        # backend:3001 + frontend:3000

# Smoke checklist (LLM'siz, deterministik)
python3 scripts/kalite_kapilari.py smoke        # workspace/smoke_checklist.json

# Manuel eşlik kontrolü (ikisi de 200 dönmeli)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/v1/operators   # backend direkt
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/v1/operators   # proxy üzerinden

# Testler
cd workspace/src/backend && npm test
cd workspace/src/frontend && npx vitest run
```

## Kalite Kapıları (scripts/kalite_kapilari.py)

Görev sonrası deterministik denetimler `studio_engine.py` tarafından otomatik koşar:

- **Regresyon taraması:** diff'te silinen `TALEP-XXX` / `closes #N` / koruma
  referansları → `workspace/docs/regresyon_uyarilari.md` + pano notu.
- **Fix+test eşleştirmesi:** fix görevi test dosyası üretmeden kapanırsa uyarı.
- **Smoke gate:** config dosyası değişikliği veya test fazında
  `workspace/smoke_checklist.json` kontrolleri koşar; başarısızlık otomatik
  müşteri talebi açar.
- **UAT→talep:** `uat_live_audit.mjs` başarısızlığı `[UAT] <görev-id>` başlıklı
  talep oluşturur (aynı görev için açık talep varsa mükerrer açılmaz).

## Regresyon Koruması

Bir dosyayı yeniden yazmadan/düzenlemeden önce `git log -p -- <dosya>` ile
geçmiş düzeltmeleri incele. `TALEP-XXX` referanslı comment'ler ve koruduğu
yapısal düzenlemeler sessizce silinmemelidir (örn. TALEP-007: operatör
dropdown'ı `overflow-x-auto` şeridinin DIŞINDA durur — vitest'teki ilgili
assert bu yapıyı korur).

## Git İş Akışı (Issue & Branch & PR Kuralı)

Her talep/hata/özellik çözümü (`git_development_workflow` global kuralı) şu
adımlarla yürütülür — doğrudan `master`'a çalışılmaz:

1. **Issue:** Görev için GitHub Issue aç (`gh issue create`), numarasını al.
   (Müşteri talepleri için issue'yu `musteri_talepleri.py` zaten oluşturur.)
2. **Branch:** `master`'dan çek ve Issue numaralı dal aç:
   ```bash
   git checkout master && git pull origin master
   git checkout -b bug/<ISSUE_NO>       # hata için
   git checkout -b feature/<ISSUE_NO>   # özellik/iyileştirme için
   ```
3. **Çözüm:** Geliştirme ve doğrulama bu dalda yapılır.
4. **Commit & Push:**
   ```bash
   git commit -m "fix/feat: <açıklama> (#<ISSUE_NO>)"
   git push -u origin bug/<ISSUE_NO>
   ```
5. **MR/PR:** `master`'a PR aç, gövdede `Closes #<ISSUE_NO>` ile bağla:
   `gh pr create --base master --head bug/<ISSUE_NO>`

## Notlar

- DB'siz çalışmada backend `DEFAULT_OPERATORS` (5 operatör) ve hafızadaki
  istasyon fallback'i ile çalışır; tam liste PostGIS + seed gerektirir.
- `studio_engine.py` proje-özeldir (sync edilmez); `scripts/kalite_kapilari.py`
  ise framework dosyasıdır ve `sync_studio.sh` ile studio reposu arasında
  iki yönlü senkronize edilir.
