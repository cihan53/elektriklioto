# Çok-Ajanlı Boru Hattı — Öğrenilenler

> ChyzTV stüdyo projesinde bedelini ödeyerek öğrendiklerimiz. Yeni bir
> ajan boru hattı kurarken bu listeyi baştan gözden geçir; buradaki her
> madde en az bir kez üretimi bozdu ya da boşa para harcattı.

## 1. Prompt ve rol tasarımı

**Her çıktı dosyası ayrı bir çağrı ister.** Bir rolün yanıtını birden çok
dosyaya yazarsan hepsi birebir aynı olur. Bizde 3 rol × 2 dosya = 3 çift
kopya doküman üretti ve md5'ler tutana kadar fark edilmedi.

**"Karşında insan yok" kuralını her prompt'a koy.** Aksi hâlde ilk rol
"dosyayı paylaşır mısınız?" diye cevap verir, o cevap doküman olarak
kaydedilir ve tüm zincir onun üzerine kurulur. Doğru kural: *soru sorma,
eksik bilgide makul varsayım yap ve varsayımı `> **Varsayım:**` ile işaretle.*

**Eksik girdi sessiz placeholder değil, sert hata olmalı.** `f"Girdi: {dosya}"`
gibi bir yer tutucu göndermek, modele "bu dosya yok" demek yerine ona
anlamsız bir metin verir; hata zincirin sonunda ortaya çıkar.

**Kelime bütçesi koy.** Sınırsız bırakılınca mimari dokümanı 7.100 kelime
oldu; bütçe konunca 1.700'e indi ve kalitesi düşmedi. Şişkin doküman aşağı
akıştaki her rolün girdisi olur, hem pahalı hem odak dağıtıcı. Kural metni:
*"KARAR dokümanı yaz, ders kitabı değil."*

**"Açık soru" bırakırsan model karar verir.** Kapsamda backend dilini
"Go / Dart Frog / Node.js / Python?" diye sorunca CTO Go seçti — oysa
kullanıcı Node.js istiyordu. Kararlar kısıt bölümüne, açık uçlu sorular
soru bölümüne. Biz bunu `(zorunlu)` işaretiyle yapısal hale getirdik:
o satırlar çıkarılıp her prompt'un en tepesine "TARTIŞMAYA KAPALI" bloğu
olarak konuyor — 50 KB'lık dokümanın ortasındaki bir işaret gözden kaçar.
Kaçış yolu bırak: kısıt teknik olarak imkânsızsa rol kendi alternatifini
seçmesin, `> **ÇATIŞMA:**` yazıp kullanıcıya bıraksın.

**Varsayılan tercih hazır paket olsun.** Kimse söylemezse model her şeyi
sıfırdan yazar; bizde olgun bir HTTP paketi dururken elle sunucu yazıldı.
Ayrı bir araştırma rolü (`tech_scout`) + uygulayıcılara "rapordan sapıyorsan
`// SAPMA:` ile gerekçelendir" kuralı bunu çözdü.

**Çapraz model denetimi işe yarıyor.** Kodu bir model ailesi yazıp başka
biri denetlerse aynı kör noktalar tekrarlanmaz. Ama araç/kabuk gerektiren
rolleri, izin modeli ince ayarlanabilen arka uçta tut (bkz. §7).

## 2. Yapılandırılmış çıktı (JSON üreten roller)

Şu dördü olmadan JSON isteme:
1. **Tam şema** prompt'ta.
2. **Geçerli enum değerleri listesi** — "şemadaki rol id'lerini kullan"
   demek yetmez, id'leri tek tek bas. Yoksa makul görünen adlar uydurur.
3. **Kesin boyut sınırı** — sınırsız bırakılan planlayıcı 28 KB'lık JSON
   üretip ortasında sözdizimi hatası yaptı. "En fazla 5 sprint × 5 görev".
4. **Doğrulama + onarım turu** — ayrıştır, şemayı denetle, hataları
   listeleyip yeniden iste. Geçersizse **diske yazma**.

**Bir role hem özel hem genel yol bırakma.** `sprint_planner` hem tasarım
listesinde bir rol hem de özel bir üretim fonksiyonu (`run_planner`)
sahibiydi; doğrusal koşucu genel yolu kullandı, şema promptu ve doğrulama
hiç çalışmadı, 106 KB'lık Türkçe anahtarlı bir yapı diske yazıldı.

## 3. Ortam denetimi

**Ölç, varsayma — ve `command -v` yalan söyler.** `/usr/local/bin/flutter`
19 baytlık bir sarmalayıcı betikti (`fvm flutter $@`). PATH kontrolü "var"
diyordu. Aracı **gerçekten çalıştır**, çıkış kodunu ve sürümünü gör.

**`stdin`'i kapat, zaman aşımı koy.** Etkileşimli bir sarmalayıcı soru
sorarsa süresiz asılır. `stdin=DEVNULL` + timeout ile ya hemen düşer ya cevap verir.

**Üç durum ayır:** VAR / BOZUK (PATH'te ama çalışmıyor) / YOK. "Bozuk"
kategorisi olmadan yanlış karar verirsin.

**Ortam raporunu stack kararını verene girdi yap** — yoksa makinede
derlenemeyecek bir teknoloji seçilir.

## 4. Süreç yönetimi ve dayanıklılık

**`nohup` ebeveyni korur, çocuğu korumaz.** Terminal kapanınca SIGHUP tüm
süreç grubuna gider ve alt süreç 129 ile ölür. Çözüm: alt süreçleri
`start_new_session=True` ile başlat.

**Arka plan başlatmaları giriş kabuğunun PATH'ini miras almaz.** `claude`
bulunamadı hatasının sebebi buydu. Mutlak yolu çöz ve ortam değişkeniyle geçir.

**Checkpoint'i rol değil dosya seviyesinde tut.** Rol ortasında çöken bir
koşu, tamamlanmış dosyaları tekrar üretmemeli.

**Tek koşucu kilidi koy.** Zamanlayıcı ve kullanıcı aynı anda başlatabilir;
iki süreç aynı dosyalara yazar. PID'li kilit dosyası + bayat kilit temizliği.

**Kota hatasında ölme, bekle.** Hata metni **boş** olabilir ve **stderr
yerine stdout'a** yazılabilir; sadece stderr'e bakma. Ayrıntısız çıkış
kodu 1'i yeniden denenebilir say.

**Çalışan süreç kod değişikliğini görmez.** Her düzeltmeden sonra koşucuyu
ve izleme ekranını yeniden başlat. Bu, "düzelttim ama hâlâ eski hatayı
veriyor" vakalarının tek sebebiydi.

**Tek giriş noktası bırak.** Parçalar eklendikçe 5 ayrı script oluştu;
kullanıcı haklı olarak "neden bu kadar uğraşıyorsun" dedi. Bir `basla.sh`
her şeyi sırayla yapsın, gerisi altyapı olarak kalsın.

## 5. Sprint / kanban akışı

**Zaman değil bağımlılık yönetsin.** Sprint N+1, takvimde sırası geldiği
için değil, Sprint N kapandığı için başlar. Cron'a bağlarsan önkoşulu
bitmemiş sprint tetiklenir ve sistem sessizce boşa döner.

**Zamanlayıcı dürtsün, karar vermesin.** Her tetikleme *tek* hazır görevi
alıp panoyu yeniden değerlendirsin. "Sprint uzarsa sonraki başlamasın"
kuralı böylece zamanlayıcıya değil durum makinesine bağlı kalır.

**Takvim kaysın.** Biten sprint gerçek tarihini korur, bitmemişler onun
ardına dizilir. Gecikme aşağı doğru yayılır, erken başlama olmaz.

**Zamanlayıcı önyükleme yapabilmeli.** Bizim tick'imiz yalnızca panoyu
yürütüyordu, pano da tasarımın sonunda üretiliyordu — tetikleyici sonsuza
kadar "pano yok" deyip çıktı. Tetikleyici, panodan önceki aşamayı da
ilerletebilmeli.

## 6. Python / kabuk tuzakları

- `dict.get(anahtar, varsayilan)` — anahtar `None` değeriyle **varsa**
  varsayılanı döndürmez. Takvim hesabını bu çökertti.
- JSON şeması içeren bir şablonda `.format()` kullanma; `{ }` yer tutucu
  sanılır. `str.replace` kullan.
- Python stdout'u dosyaya yönlendirilince blok tamponlar; `tail -f` uzun
  süre boş görünür. `sys.stdout.reconfigure(line_buffering=True)`.
- `max_tokens` thinking token'larını **da** kapsar. Düşük tutarsan model
  bütçeyi düşünmeye harcayıp boş yanıt döndürür. Bizde 32k yetmedi, 64k oldu.
- CLI'lar birbirine benzemez: `claude` `--system-prompt` alır, `agy` almaz
  (rol tanımını kullanıcı mesajına gömmek gerekir). `agy` bayrakları Go
  tarzıdır (`-p=<metin>`, ayrık argüman çalışmaz) ve model adı effort'u
  içeriyorsa (`gemini-3.8-flash-high`) ayrıca `--effort` verilemez.
- `pgrep ... | cut` zincirinde çıkış kodu `cut`'ındır; `||` dalı beklediğin
  gibi çalışmaz.


## 7. Ajanlara araç ve kabuk erişimi vermek

**"DONE" hedefe ulaşıldığının kanıtı değildir.** Görev tamamlandı işaretlendi,
13 KB dosya üretti, süre 265 saniye — ama `docker ps` boştu. Görev durumunu
değil **gerçek dünya etkisini** doğrula: konteyner ayakta mı, tablo oluştu mu,
uç nokta cevap veriyor mu.

**Ajan yalnızca yolu tanımlı olan dosyayı üretebilir.** `docker-compose.yml`
üretilmedi çünkü rolün tanımlı çıktıları arasında öyle bir yol yoktu; ajan
compose'u CI dosyasının içine yorum olarak gömmek zorunda kaldı. Bir rolün
üretmesini istediğin her artefakt için çıktı yolu aç — dizin hedefi (`.../`)
birden çok dosya gerektiğinde en esnek çözüm.

**Üretmek ile çalıştırmak ayrı görevlerdir.** Motor dosyaları modelin
yanıtından SONRA yazar; dolayısıyla model, aynı çağrıda ürettiği dosyayı
çalıştıramaz. "Compose üret" ve "compose'u ayağa kaldır ve doğrula" iki ayrı
görev olmalı, ikincisi birincisine bağımlı.

**Araç reddi sessiz olabilir.** `agy` bir aracı reddettiğinde `status: SUCCESS`
döner, `response` **boş** kalır ve gerçek sebep `denied_actions` alanında
gizlenir. Bunu okumadan hatayı "boş yanıt, bütçe yetersiz" diye yorumlayıp
yanlış tarafa bakarsın. Her CLI'nin hata JSON'ındaki tüm alanları oku.

**İzin modelleri kaba veya ince olabilir; rolü ona göre yerleştir.** `agy`
ya hepsini açar (`--dangerously-skip-permissions`) ya hiçbirini. `claude`
desen bazlı izin verir (`Bash(docker:*)`) ve bunu CLI seviyesinde **zorlar** —
test ettim: `docker --version` çalıştı, `rm -rf` reddedildi. Kabuk gerektiren
roller ince ayarlı arka uçta olmalı.

**İzin listesi karşılaştırmasını desenle yap.** Yasak listesini ham araç adıyla
karşılaştırırsan `Bash(docker:*)` girdisi "Bash"e eşleşmez, Bash yasakta kalır
ve desenli izin hiç çalışmaz. Parantezli kısmı atarak karşılaştır.

**Kabuk vermeden önce üç katman kur:**
1. **Geri alma** — `git init` + commit. Sürüm kontrolü olmadan kabuk erişimi
   vermek, geri dönüşü olmayan risk almaktır.
2. **Zorlanan allowlist** — izin verilen komut önekleri. `rm`, `mv`, `sudo`,
   `chmod`, `brew`, `launchctl` listede olmasın. Denylist sızdırır, allowlist
   kullan.
3. **Prompt kuralı + kaçış yolu** — proje kökü dışına çıkma, silme yok, Docker'da
   kök bağlama (`-v /:/...`) yok. Bir şeyin silinmesi gerekiyorsa ajan
   `> **SİLİNMELİ:** <yol> — <gerekçe>` yazıp kullanıcıya bıraksın.

Ayrıca "ölçemediğin metriği tahminle doldurma, `ÖLÇÜLEMEDİ: <sebep>` yaz"
kuralını koy — yoksa çalışmayan bir sistem için gerçekçi görünen sayılar üretir.

## 8. Depo ve kimlik bilgisi hijyeni

**Push etmeden önce görünürlüğü kontrol et.** Depo public'ti; gönderilecekler
arasında tehdit modeli ve güvenlik tasarımı vardı — yayınlanmamış bir sistemin
Sybil karşı önlemlerini ve rate limiting eşiklerini herkese açmak, atlatmak
isteyene yol haritası vermektir. Önce `gh repo view --json visibility`.

**Push öncesi sır taraması:** `git ls-files` içinde token dosyası var mı,
`git grep -E "sk-ant-[A-Za-z0-9_-]{20,}"`, `.env`/`.pem`/`.p12` izleniyor mu.

**Deploy key'ler depo başınadır.** `ssh -T git@github.com` sana anahtarın hangi
depoya bağlı olduğunu söyler ("Hi owner/repo!"). Yanlış depoya bağlı bir
anahtarla push denemesi kafa karıştırıcı hatalar verir. Yeni depo için yeni
anahtar üret, `gh repo deploy-key add --allow-write` ile ekle, `~/.ssh/config`
içinde Host takma adı tanımla.

**Docker Desktop kaldırıldıysa kalıntısı her komutu bozar.**
`~/.docker/config.json` içindeki `"credsStore": "desktop"` satırı, yardımcı
ikili olmadığı için `docker run`'ı daha kimlik doğrulamaya gelmeden düşürür.
Colima gibi bir çalıştırıcıya geçerken bu satırı kaldır; Homebrew eklentileri
için `cliPluginsExtraDirs` ekle.

## 9. İnteraktif Doğrulama Kapısı ve "Kağıt Üstünde DONE" Tuzağı

**Simülasyon ile gerçek dünya aynı şey değildir.** QA ve DevOps ajanları sadece test
dosyası (`.test.ts`), Docker yapılandırması veya markdown raporu üretip görevi
tamamladığında motor doğrudan `[DONE]` vermemelidir. Bu durum kullanıcıda "her şey
bitti ve çalışıyor" yanılgısı yaratır; oysa yerel makinede `node_modules` bile
inmemiştir.

**Doğrulama Kapısı (Verification Gate) kur.** `test` ve `deploy` fazındaki görevlerde
motor, hedef klasörde bağımlılıkların (`node_modules`, Docker daemon vb.) olup
olmadığını denetlemelidir:
- Eksikse terminale açıkça kurulum komutlarını basmalı (`npm install` / `yarn install --ignore-engines`).
- Etkileşimli modda kullanıcıya sormalı: *"Gerçek testleri yerel ortamda çalıştırmak istiyor musunuz? (e/h)"*.
- Testleri fiilen koşturmalı (`npm test`) ve gerçek çıkış kodunu (`exit code 0`)
  görevin durum notuna ve rapora bağlamalıdır.

**Sprint Kapanış Canlı Test Rehberi bas.** Bir sprint bittiğinde geliştiricinin
klasörler arasında kaybolmaması için terminale açıkça canlı test adımları
basılmalıdır: Veritabanı, Backend API, Web Harita ve Test komutları.

## 10. Tek Tıkla (On-Click) Canlı Ortam Başlatıcı (`canli.sh`)

**Geliştiriciyi klasör klasör dolaştırma.** Backend, frontend ve veritabanı farklı
alt dizinlerdeyse kullanıcıya "önce infra'ya git compose aç, sonra backend'e git
dev de, sonra frontend'e git yarn dev yap" demek büyük bir sürtünmedir.

**Her projede kök dizinde `canli.sh` orkestrasyon betiği olsun.** Bu betik:
1. Önceden asılı kalmış portları (3000, 3001 vb.) otomatik temizlemelidir (`lsof -ti:port | xargs kill -9`).
2. Eksik bağımlılıkları sessizce kurmalıdır.
3. Docker çalışıyorsa veritabanını arka planda ayağa kaldırmalıdır.
4. Backend ve Frontend'i eşzamanlı başlatmalıdır.
5. Tarayıcıyı otomatik olarak `http://localhost:3000` adresine açmalıdır (`open`).
6. **Zarif Kapanış (Graceful Shutdown):** `SIGINT / SIGTERM / EXIT` yakalayarak (`trap cleanup`)
   Ctrl+C yapıldığında arkada yetim (zombie) süreç veya kilitli port bırakmamalıdır.

**Kuralı ajan şemasına göm.** `sprint_planner` ve `devops_engineer` sistem
promptlarına bu kuralı ekle: İlk sprintte (S1) kök dizinde `canli.sh` üretmek
zorunludur.

## 11. Paket Yöneticisi Katılıkları ve Sürüm Uyumu

**Yarn 1.x motor denetimi tuzağı.** Yarn v1, paketlerin istediği Node motor
sürümlerini aşırı katı denetler. Sistemde Node 22.21.0 varken bir alt paketin
(`nopt`) 22.22.2 talep etmesi gibi 0.01'lik küçük bir yama farkında bile kurulumu
anında durdurur (`Found incompatible module`).

**Önleyici tedbir:**
- Projelerin kök veya alt dizinlerine mutlaka `.yarnrc` dosyası koy ve `ignore-engines true` ekle.
- Komutlarda `yarn install --ignore-engines` kullan veya bu tür katı kısıtlar
  uygulamayan standart `npm` tercih et.

## 12. Modüler Refactor'da Rota ve Kod Kaybı (Route Regression)

**Yeni sprint eski sprintin kodunu ezmemeli.** S1'de yazılan harita listeleme
rotası (`GET /api/v1/stations?bbox=...`), S2'de istasyon detay modülü (`/stations/:slug`)
yazılırken backend mühendisi tarafından unutuldu ve dosya üzerine yazıldığı için
kayboldu. Arayüz açıldığında 404 hatası verdi.

**Kurallar:**
1. Ajan bir dizini veya modülü güncellerken mevcut rotaları silmemeli, genişletmelidir.
2. QA mühendisi regresyon testlerinde önceki sprintin temel uç noktalarını da
   çağırmaya devam etmelidir.
3. **Zarif Fallback Katmanı:** Veritabanı henüz tohumlanmamış veya Docker kapalı olsa bile
   uç noktalar 404/500 vermek yerine anlamlı mock/fallback verisi dönmeli; böylece
   arayüz geliştirici veya kullanıcı veritabanı kurulumunu beklemeden haritayı hemen
   test edebilmelidir.

## 13. Multi-file Üretiminde Dizin Ezme (Directory Wipeout) Tuzağı

**`write_multi_file` tüm dizini `.stale`'e taşımamalı.**
Bir görev bir dizin çıktısı (`workspace/src/backend/` veya `workspace/src/frontend/`) hedeflediğinde, motor eski dizini toptan `.stale`'e taşıyıp sıfırdan dizin açarsa:
- Önceki sprintlerde üretilmiş bağımsız alt modüller (`stations`, `operators`, `db` şemaları vb.) kaybolur.
- Kurulu `node_modules` paketleri arşivlenir; yeni görev sadece kendi az sayıdaki paketini bildiği için çalışma anında `ERR_MODULE_NOT_FOUND` (örn. `drizzle-orm`) patlar.

**Önleyici kural:**
Motor dizini toptan taşımamalı, **dosya bazlı birleştirme (merge)** yapmalıdır. Yalnızca üzerine yazılan münferit dosyalar gerekiyorsa yedeklenmeli, dizin ağacı ve kütüphaneler korunmalıdır.

## 14. Nuxt 3 / Vite Dev Server ve "Upgrade Required" (HTTP 426) Hatası

**macOS ve Node 22'de `localhost` IPv6 HMR Çakışması.**
Nuxt 3 dev modunda çalışırken (`nuxt dev`), Vite HMR (Hot Module Replacement) WebSocket sunucusunu aynı porta bağlar. macOS ve modern Node (v20+) ortamlarında `localhost` varsayılan olarak IPv6 (`::1`) üzerinden çözülür. Tarayıcı standart HTTP GET isteği gönderdiğinde Vite'ın WebSocket dinleyicisi isteği yakalar ve WebSocket `Upgrade` başlığı beklediği için HTTP 426 "Upgrade Required" hatası döner.

**Önleyici tedbir:**
1. `nuxt.config.ts` içinde `devServer` ve Vite HMR hostunu açıkça `127.0.0.1` (IPv4) olarak sabitle:
   ```typescript
   devServer: { host: '127.0.0.1', port: 3000 },
   vite: { server: { hmr: { protocol: 'ws', host: '127.0.0.1' } } }
   ```
2. Başlatıcı ve kullanıcı linklerinde `http://localhost:3000` yerine öncelikle `http://127.0.0.1:3000` adresini kullan.

## 15. Arka Plan Süreç Yönetimi (`exec`, `pkill -P`) ve Port İzolasyonu

**Bash alt kabuk (subshell) yetim süreç (orphan process) bırakır.**
`canli.sh` gibi başlatıcı betiklerde `(cd dir && yarn dev) &` şeklinde komut verildiğinde `$!` olarak kaydedilen PID, gerçek Node sürecinin değil, dış kabuk ara sürecinin PID'sidir. `kill $PID` yapıldığında sadece kabuk kapanır; `yarn`, `node`, `tsx`, `vite` ve `nitro` gibi alt çocuk süreçler portu tutmaya devam eder.

**Önleyici tedbir:**
1. Arka plan süreçlerini ara kabuk olmadan doğrudan çalıştır: `(cd dir && exec env PORT=... yarn dev) &`. `exec`, kabuğun yerini doğrudan hedef ikilinin almasını sağlar.
2. `cleanup` kapanış fonksiyonunda `pkill -P "$PID"` ile sürecin başlattığı tüm alt çocuk süreçleri (process tree) hiyerarşik olarak temizle.
3. Kapanış anında kullanılan portları (3000, 3001) döngü ile denetle ve kalan süreç varsa temizle.
4. Fastify backend tarafında Base64 parametreli rotalar için `maxParamLength: 4096` tanımlamayı unutma.

## 16. Otomatik İyileştirme ve Kendi Kendini Onarma Motoru (Self-Healing Loop)

**Kod üretiminden hemen sonra otomatik regresyon ve derleme kapısı.**
Yapay zeka ajanları bazen aceleyle veya önceki kapsamı unutarak kod üretebilir. Bu durumun manuel müdahale gerektirmeden çözülmesi için motora **Self-Healing Loop** entegre edilmelidir.

**Çalışma Prensibi:**
1. **Artımlı Bağlam (Incremental Context):** Görev başlamadan önce hedef dizindeki mevcut dosyalar ve ana omurga (`app.ts`, `package.json`, `nuxt.config.ts`) taranıp ajana *"Önceki rotaları ASLA silme, genişleterek ekle"* talimatı verilir.
2. **Anlık Doğrulama:** Kod yazıldığı an motor hedef dizinde:
   - Kritik rotaların silinip silinmediğini (`/stations`, `/operators`) kontrol eder.
   - `npx tsc --noEmit` ile TypeScript derleme hatası olup olmadığını bakar.
3. **Otomatik Onarım Döngüsü:** Hata varsa motor görevi doğrudan bitirmez; hata çıktısını ajana geri göndererek *"Şu hata oluştu, mevcudu koruyarak düzelt"* diyerek 2 kez otomatik onarım turu başlatır. Kod ancak hatasız olduğunda diske onaylanır.

## 17. Python Subprocess ve İkili (Binary) Dosyalarda "ValueError: embedded null byte" Tuzağı

**`node_modules` altındaki ikili dosyalar prompt'a sızmamalı.**
Bir ajanın (`qa_lead` gibi) girdi listesinde bir kod dizini (`workspace/src/backend/`) olduğunda, `read_input` fonksiyonu `p.rglob("*")` ile o dizindeki tüm dosyaları okur. Eğer `node_modules` (özellikle `.bin/esbuild` gibi ikili çalıştırılabilir dosyalar) filtrelenmezse, bu ikili dosyaların içindeki ASCII `\x00` (NUL) baytları doğrudan prompt metnine karışır.

Python 3.14 (ve tüm modern POSIX Python sürümleri), `subprocess.Popen` veya `subprocess.run` çağrısında komut argümanı içinde `\x00` gördüğünde güvenlik ve C uyumu gereği derhal çöker:
`ValueError: embedded null byte`

**Önleyici tedbir:**
1. `read_input` ve dosya tarama fonksiyonlarında `node_modules`, `.bin`, `.git`, `.nuxt`, `dist`, `__pycache__` dizinlerini katı bir izin/engelleme listesiyle hariç tut.
2. Dosya okunurken ikili bayt denetimi yap: `if b"\x00" in raw: continue` (ikili dosyaları atla).
3. `subprocess`'a gönderilecek birleştirilmiş prompt metnini her ihtimale karşı `.replace("\x00", "")` ile temizle.


## 18. Süreç Çökmesi Sonrası "Yetim (Orphan) RUNNING Görevleri" ve Kilit (Lock) Çakışması

**Çöken bir koşunun ardından görev RUNNING kalırsa, yeni başlatılan koşucu kendini kilitli sanarak durmamalı.**
Bir görev icra edilirken süreç aniden ölürse (örn: `kill`, `SIGTERM`, `ValueError` veya elektrik/bağlantı kesintisi), `pano.json` içerisinde o görev `"status": "RUNNING"` durumunda asılı kalır.

Yeni başlatılan bir koşucu (`./basla.sh`) şu döngüye düşüyordu:
1. `studio_engine.py` başlarken `workspace/.lock` dosyasını kendi PID'si ile oluşturuyordu.
2. Ardından `run_board()` çağrıldığında `refresh(board)` fonksiyonu eski mantıkla `if not (WORKSPACE / ".lock").exists():` kontrolü yapıyordu.
3. Ancak kilit dosyası koşucunun KENDİSİ tarafından zaten oluşturulmuş olduğundan, `not exists` koşulu yanlış (False) çıkıyor ve `RUNNING` görev kurtarılmıyordu.
4. Panoda hiç `READY` görev kalmadığı için koşucu 0.5 saniyede "Hazır görev yok" diyerek 0 koduyla çıkıyordu.
5. `basla.sh` ise 2 saniye sonra sürecin sonlandığını görünce "Koşucu hemen düştü" uyarısı veriyordu.

**Çözüm:**
1. `studio_board.py` içine `is_runner_active()` fonksiyonu eklendi; kilitteki PID mevcut sürecin kendi PID'si (`os.getpid()`) ise dışarıda başka bir aktif koşucu olmadığı anlaşıldı.
2. `recover_orphans(board)` fonksiyonu yazılarak, koşu başlarken yetim kalmış `RUNNING` görevler otomatik olarak `READY` durumuna çekilip panoya kaydedildi.
3. `run_board()` başladığında ilk iş olarak yetim görevler kurtarılır.




