# elektriklioto.com — Çok-Ajanlı Studio Framework: Öğrenilenler

> Bu belge, AI ajanlarının ve geliştirici ekibinin tekrar aynı hataya düşmemesi için
> gerçek üretim deneyiminden damıtılmış kurallardır. Her madde en az bir kez
> üretimi bozdu veya zaman kaybettirdi.

---

## 1. Prompt & Rol Tasarımı

- **Her çıktı dosyası ayrı bir çağrı ister.** Tek rolden birden fazla dosya isteme; hepsi kopya olur.
- **"Karşında insan yok" kuralını her prompt'a ekle.** Aksi hâlde rol soru sorar, cevap doküman olarak kaydedilir.
- **Eksik girdi sessiz placeholder değil, sert hata olmalı.** Yer tutucu göndermek modele anlamsız metin verir.
- **Kelime bütçesi koy.** Sınırsız bırakılan mimari doküman 7.100 kelime oldu; bütçeli hali 1.700'de daha kaliteliydi.
- **Açık soru bırakırsan model karar verir.** Kısıtlar "TARTIŞMAYA KAPALI" bloğuna, sorular soru bölümüne.
- **Çapraz model denetimi işe yarıyor.** Bir model yazar, başkası denetlerse kör noktalar azalır.

---

## 2. Yapılandırılmış Çıktı (JSON Üreten Roller)

Bu dördü olmadan JSON isteme:
1. **Tam şema** prompt'ta.
2. **Geçerli enum değerleri listesi** — "şemadaki id'leri kullan" yetmez, tek tek bas.
3. **Kesin boyut sınırı** — sınırsız bırakılan planlayıcı 28 KB'lık hatalı JSON üretti.
4. **Doğrulama + onarım turu** — geçersizse diske yazma, yeniden iste.

---

## 3. Ortam Denetimi

- **Ölç, varsayma.** `command -v flutter` "var" diyordu; aslında 19 baytlık sarmalayıcıydı.
- **`stdin`'i kapat, timeout koy.** Etkileşimli araç soru sorarsa süresiz asılır.
- **Üç durum ayır:** VAR / BOZUK / YOK. "Bozuk" kategorisi olmadan yanlış karar verirsin.
- **Ortam raporunu teknoloji kararına girdi yap** — yoksa derlenemeyen bir stack seçilir.

---

## 4. Süreç Yönetimi ve Dayanıklılık

- **`nohup` ebeveyni korur, çocuğu korumaz.** Alt süreçleri `start_new_session=True` ile başlat.
- **Arka plan süreçleri giriş kabuğunun PATH'ini miras almaz.** Mutlak yolu çöz, ortam değişkeniyle geçir.
- **Checkpoint'i rol değil dosya seviyesinde tut.** Tamamlanmış dosyalar tekrar üretilmemeli.
- **Tek koşucu kilidi koy.** PID'li kilit + bayat kilit temizliği şart.
- **Kota hatasında ölme, bekle.** Hata mesajı boş gelebilir ve stderr yerine stdout'a yazılabilir.
- **Çalışan süreç kod değişikliğini görmez.** Her düzeltmeden sonra koşucuyu yeniden başlat.
- **Tek giriş noktası bırak.** Tek bir `basla.sh` her şeyi sırayla yapsın.

---

## 5. Sprint / Kanban Akışı

- **Zaman değil bağımlılık yönetsin.** Sprint N+1, takvimde sırası gelince değil, N kapanınca başlar.
- **Zamanlayıcı dürtsün, karar vermesin.** Her tetikleme tek hazır görevi alıp panoyu yeniden değerlendirsin.
- **Takvim kaysın.** Gecikme aşağı yayılır; erken başlama olmaz.
- **Zamanlayıcı önyükleme yapabilmeli.** Pano yoksa "pano yok" deyip çıkmamalı; önceki aşamayı ilerletmeli.

---

## 6. Python / Kabuk Tuzakları

- `dict.get(key, default)` — anahtar `None` değeriyle **varsa** varsayılanı döndürmez.
- JSON şeması içeren şablonda `.format()` kullanma; `{` `}` yer tutucu sanılır. `str.replace` kullan.
- Python stdout dosyaya yönlendirilince blok tamponlar; `sys.stdout.reconfigure(line_buffering=True)` ekle.
- `max_tokens` thinking token'larını da kapsar. Düşük tutarsan model boş yanıt döndürür.
- CLI'lar farklı: `claude` `--system-prompt` alır, `agy` almaz (rolü kullanıcı mesajına göm). `agy` bayrakları Go tarzıdır (`-p=<metin>`).
- `pgrep | cut` zincirinde çıkış kodu `cut`'ındır; `||` dalı beklendiği gibi çalışmaz.

---

## 7. Ajanlara Araç ve Kabuk Erişimi

- **"DONE" gerçek dünya etkisinin kanıtı değildir.** `docker ps` boş olabilir; dosya üretildi ≠ sistem çalışıyor.
- **Ajan yalnızca tanımlı çıktı yollarına yazabilir.** Üretmesini istediğin her artefaktı şemada aç.
- **Üretmek ve çalıştırmak ayrı görevlerdir.** Aynı çağrıda üretilen dosya çalıştırılamaz.
- **Araç reddi sessiz olabilir.** `agy` reddettiğinde `status: SUCCESS` döner; `denied_actions` alanını oku.
- **Kabul vermeden önce:** git init + commit → zorlanan allowlist → prompt kuralı + kaçış yolu.

---

## 8. Depo ve Kimlik Bilgisi Hijyeni

- **Push öncesi görünürlük kontrolü.** `gh repo view --json visibility` — public depoya güvenlik belgesi gönderme.
- **Sır taraması:** `git grep -E "sk-ant-[A-Za-z0-9_-]{20,}"` — token, `.env`, `.pem` izleniyor mu?
- **Deploy key'ler depo başınadır.** `ssh -T git@github.com` hangi depoya bağlı olduğunu söyler.
- **Docker Desktop kalıntısı her komutu bozar.** `~/.docker/config.json`'daki `credsStore: desktop` satırını sil.

---

## 9. Doğrulama Kapısı — "Kağıt Üstünde DONE" Tuzağı

- **Test dosyası üretmek ≠ testi geçmek.** Motor `test`/`deploy` fazında gerçek çalıştırma yapmalı.
- **Doğrulama Kapısı:** Bağımlılık var mı? → Test koş → Çıkış kodu 0 mu? → Ancak o zaman DONE.
- **Sprint kapanışında canlı test rehberi bas:** DB, Backend, Frontend sırasıyla başlatma adımları.

---

## 10. Canlı Ortam Başlatıcı (`canli.sh`)

- **Geliştiriciyi klasör dolaştırma.** Kök dizinde tek bir `canli.sh` her şeyi yönetsin.
- Betik şunları yapmalı: eski portları temizle → bağımlılıkları kur → Docker'ı başlat → Backend + Frontend → tarayıcıyı aç.
- **Zarif kapanış:** `trap cleanup` ile Ctrl+C'de yetim süreç veya kilitli port bırakma.
- `sprint_planner` şemasına ekle: S1'de `canli.sh` üretmek zorunludur.

---

## 11. Paket Yöneticisi Sürüm Uyumu

- **Yarn 1.x motor denetimi tuzağı.** Node 22.21.0 varken alt paketin 22.22.2 istemesi kurulumu durdurur.
- **Çözüm:** `.yarnrc` dosyasına `ignore-engines true` ekle veya `yarn install --ignore-engines` kullan.

---

## 12. Modüler Refactor'da Rota Kaybı (Route Regression)

- **Yeni sprint eski sprintin kodunu ezmemeli.** S1'de yazılan `GET /api/v1/stations` S2'de silindi; harita 404 verdi.
- Ajan dizini güncellerken mevcut rotaları silmemeli, genişletmelidir.
- QA, önceki sprintin temel uç noktalarını her sprinte regresyon olarak test etmeli.
- **Zarif fallback:** DB kapalıysa 500 değil, anlamlı mock veri dön.

---

## 13. Multi-file Üretiminde Dizin Ezme

- **`write_multi_file` tüm dizini `.stale`'e taşımamalı.** Önceki modüller ve `node_modules` kaybolur.
- **Kural:** Dosya bazlı birleştirme (merge) yap. Yalnızca değişen münferit dosyaları yedekle.

---

## 14. Nuxt 3 / Vite — "HTTP 426 Upgrade Required" Hatası

- **macOS + Node 22'de `localhost` IPv6 HMR çakışması.** Vite WebSocket dinleyicisi HTTP isteğini yakalar.
- **Çözüm:** `nuxt.config.ts`'de `devServer.host: '127.0.0.1'` ve `vite.server.hmr.host: '127.0.0.1'` sabitle.

---

## 15. Arka Plan Süreçleri ve Port İzolasyonu

- **Bash alt kabuk yetim süreç bırakır.** `(cd dir && yarn dev) &` → `kill $PID` sadece kabuğu öldürür.
- **Çözüm:** `exec` kullan: `(cd dir && exec env PORT=... yarn dev) &`. `exec` kabuğun yerini alır.
- `cleanup`'ta `pkill -P "$PID"` ile tüm çocuk süreci temizle.
- Fastify'da Base64 parametreli rota için `maxParamLength: 4096` unutma.

---

## 16. Self-Healing Loop (Otomatik Onarım Motoru)

- **Kod üretiminden hemen sonra derleme kapısı gerekir.**
- **Çalışma prensibi:**
  1. Görev başlamadan önce mevcut dosyaları tara, "Önceki rotaları silme, genişlet" talimatı ver.
  2. Kod yazıldıktan sonra `npx tsc --noEmit` ile TypeScript derleme hatası kontrol et.
  3. Hata varsa görevi bitirme; hatayı ajana geri gönder, 2 kez otomatik onarım turu başlat.

---

## 17. Python Subprocess — "embedded null byte" Tuzağı

- **`node_modules` altındaki binary dosyalar prompt'a sızmamalı.**
- `p.rglob("*")` ile dizin taranırken `.bin/esbuild` gibi binary'ler NUL (`\x00`) baytı içerir.
- Python `subprocess.run` içinde `\x00` görünce `ValueError` fırlatır ve süreç ölür.
- **Önlem:** `node_modules`, `.bin`, `.git`, `.nuxt`, `dist`, `__pycache__` hariç tut. Binary dosyaları `if b"\x00" in raw: continue` ile atla.

---

## 18. Yetim (Orphan) RUNNING Görevleri ve Kilit Çakışması

- **Çöken koşu pano.json'ı `RUNNING` bırakır.** Yeni koşucu "READY görev yok" diyerek çıkar.
- **Sorun:** Kilit dosyasını koşucu kendi oluşturur; ardından `not .lock.exists()` kontrolü False döner — kendi kendini kilitlenmiş sanır.
- **Çözüm:**
  - `is_runner_active()`: Kilitteki PID kendi PID'i mi kontrol et.
  - `recover_orphans(board)`: Başlangıçta yetim `RUNNING` görevleri `READY`'e çek.

---

## 19. Studio Yetkilisi — Akıllı Kategori Motoru (v2.0)

- **Problem (v1):** Sabit keyword eşleştirmesi. `"api"` kelimesi geçen her talep `backend_engineer` + Fastify dosyalarına atanıyordu. "EPDK scraper'ı canlı çek" talebi Fastify rota düzeltmesi planı aldı.

- **Çözüm (v2):**
  1. **`KATEGORILER` listesi** — öncelik sıralı dict'ler. Her kategorinin kendi `anahtar_kelimeler`, `dosyalar`, `plan_asamalari`, `kabul_kriterleri` alanları var. Spesifik kategoriler (`data_engineer`) genel olanlardan (`backend_engineer`) önce gelir.
  2. **`ai_danisma()` fonksiyonu** — `agy` → `claude` → statik fallback zinciri. Her araca 30 sn timeout. Hiçbiri yoksa sistem sessizce devam eder, çökmez. AI cevabı planın kök neden bölümüne enjekte edilir.
  3. **Kategoriye özgü dinamik plan şablonları** — `data_engineer` scraper/ETL adımları, `backend_engineer` Fastify adımları, `devops_engineer` zamanlanmış görev adımları alır.

- **Kural — Yeni bileşen eklenince:**
  - `KATEGORILER` listesine yeni bir dict ekle; genel şablon koda dokunma.
  - `anahtar_kelimeler` lowercase olmalı (eşleştirme `.lower()` üzerinden).
  - AI prompt'u Türkçe ve kısa tut (3-5 cümle); uzun prompt timeout riskini artırır.

- **Test:** TALEP-017 v1'de `backend_engineer` → v2'de `data_engineer`. Claude bağımsız olarak `auth/rate-limit`, `scraping kırılganlığı` ve `şema tutarlılığı` risklerini tespit etti.

---

*Son güncelleme: 2026-09-19 — Studio Yetkilisi v2.0 yükseltmesi ile güncellendi.*
