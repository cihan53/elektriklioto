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
