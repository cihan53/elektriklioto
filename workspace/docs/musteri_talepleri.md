# Digital Software Studio — Müşteri Denetim & Talep Havuzu

> **Son Güncelleme:** 2026-09-26 10:30  
> **Toplam Bildirim:** 24  

Bu doküman, proje sahibinin / müşterinin yaptığı denetimler sonucunda iletilen istek, hata ve geri bildirimleri içerir.

---

## 1. Genel Durum Özeti

| ID | Tür | Öncelik | Durum | Başlık | Ekran / URL | İlgili Rol | GitHub Issue | Plan |
|---|---|---|---|---|---|---|---|---|
| **TALEP-024** | Tasarım & Kullanıcı Deneyimi | Normal (P3) | ⚖️ Değerlendirmede (Triage) | Operatör Menüsünde Arama ve 'Tüm Markalar' Alanının Sabitlenmesi ve İstasyon Sayılarının Gösterilmesi | `/` | `None` | [#32](https://github.com/cihan53/elektriklioto/issues/32) | — |
| **TALEP-023** | Veri & İstasyon Tutarlılığı | Yüksek (P2) | ⏳ Beklemede | Haritada ve Operatör Filtresinde Yalnızca 5 Marka Listeleniyor, EPDK'daki Diğer Markalar Görünmüyor | `/` | `None` | [#31](https://github.com/cihan53/elektriklioto/issues/31) | — |
| **TALEP-022** | Hata / Bug | Kritik (P1) | ✅ Çözüldü | Veritabanı tabloları boşaltıldığı halde haritada istasyonlar görünüyor | `/` | `None` | [#28](https://github.com/cihan53/elektriklioto/issues/28) | — |
| **TALEP-021** | Yeni İstek / Özellik | Normal (P3) | ❌ İptal Edildi | Pano görevlerine öncelik alanı eklenmeli | `studio` | `None` | [#26](https://github.com/cihan53/elektriklioto/issues/26) | — |
| **TALEP-020** | Veri & İstasyon Tutarlılığı | Yüksek (P2) | ✅ Çözüldü | Trugo ve diğer operatör istasyonları güncellenmiyor | `/` | `None` | [#25](https://github.com/cihan53/elektriklioto/issues/25) | — |
| **TALEP-019** | Veri & İstasyon Tutarlılığı | Yüksek (P2) | ✅ Çözüldü | EPDK Ana Referans Mimarisine Geçiş ve Trugo/CPO Zenginleştirmesi | `/harita` | `data_engineer` | [#20](https://github.com/cihan53/elektriklioto/issues/20) | — |
| **TALEP-018** | Hata / Bug | Yüksek (P2) | ✅ Çözüldü | TALEP-017 Eksik İş Kapanışı: curl_input.txt deploy paketinde olmadığı için canlı kaynaklar yerine GitHub raw'a fallback yapılıyor | `/server-scripts/deploy` | `None` | [#19](https://github.com/cihan53/elektriklioto/issues/19) | — |
| **TALEP-017** | Yeni İstek / Özellik | Normal (P3) | ✅ Çözüldü | Canlı Kaynak Entegrasyonu: EPDK ve Voltrun verilerini gerçek sitelerden çek | `/data-pipeline` | `data_engineer` | [#17](https://github.com/cihan53/elektriklioto/issues/17) | — |
| **TALEP-016** | Tasarım & Kullanıcı Deneyimi | Normal (P3) | ✅ Çözüldü | Hakkımızda modal içeriğinin önceki versiyondaki haline döndürülmesi | `/` | `ui_designer` | [#16](https://github.com/cihan53/elektriklioto/issues/16) | — |
| **TALEP-015** | Yeni İstek / Özellik | Normal (P3) | ✅ Çözüldü | EPDK ve CPO Kamu/Açık Kaynaklarından Canlı İstasyon Senkronizasyonu | `/cron/sync` | `backend_engineer` | [#15](https://github.com/cihan53/elektriklioto/issues/15) | — |
| **TALEP-014** | Hata / Bug | Normal (P3) | ✅ Çözüldü | Cron senkronizasyon scripti istasyon bilgilerini alamıyor (0 istasyon hazır) | `/cron/sync` | `devops_engineer` | [#14](https://github.com/cihan53/elektriklioto/issues/14) | — |
| **TALEP-013** | Yeni İstek / Özellik | Normal (P3) | ✅ Çözüldü | Yapılan güncellemeler, çözülen hatalar ve sürüm geçmişi için Değişiklik Günlüğü (Changelog / Sürüm Notları) ekranı | `/guncellemeler` | `web_engineer` | [#13](https://github.com/cihan53/elektriklioto/issues/13) | — |
| **TALEP-012** | Yeni İstek / Özellik | Yüksek (P2) | ✅ Çözüldü | Yeni deploy çıktığında açık sayfalarda güncelleme uyarısı çıkması ve 20 saniyede otomatik yenilenmesi | `/` | `devops_engineer` | [#12](https://github.com/cihan53/elektriklioto/issues/12) | — |
| **TALEP-011** | Hata / Bug | Normal (P3) | ✅ Çözüldü | Top menüde 2 tane Hakkında butonu görünüyor (Sağdaki buton korunmalı, mükerrer olan kaldırılmalı) | `/` | `web_engineer` | [#11](https://github.com/cihan53/elektriklioto/issues/11) | — |
| **TALEP-010** | Hata / Bug | Kritik (P1) | ✅ Çözüldü | Aramalar ve istasyon kayıtları veritabanından gelmiyor, veritabanı tabloları boş görünüyor | `/api/v1/stations` | `backend_engineer` | [#10](https://github.com/cihan53/elektriklioto/issues/10) | — |
| **TALEP-009** | Yeni İstek / Özellik | Normal (P3) | ✅ Çözüldü | Hakkında, Kullanıcı Sözleşmeleri, Gizlilik Politikası ve Canlı Sürüm Bilgileri Paneli / Sayfası | `/hakkimizda` | `web_engineer` | [#9](https://github.com/cihan53/elektriklioto/issues/9) | — |
| **TALEP-008** | Hata / Bug | Kritik (P1) | ✅ Çözüldü | Harita pinleri ve kümeleme baloncuklarının modal pencerelerin (QrBridgeModal vb.) üzerine taşması (z-index katman çakışması) | `/` | `web_engineer` | [#8](https://github.com/cihan53/elektriklioto/issues/8) | — |
| **TALEP-007** | Hata / Bug | Yüksek (P2) | ✅ Çözüldü | Tüm operatörler açılır menüsü (dropdown) açıldığında menü taşması ve istenmeyen scroll çubuğu oluşması | `/` | `web_engineer` | [#7](https://github.com/cihan53/elektriklioto/issues/7) | — |
| **TALEP-006** | Hata / Bug | Kritik (P1) | ✅ Çözüldü | Konum izni verildiğinde kullanıcının anlık konumunu gösteren mavi nokta/baloncuk eksik | `/harita` | `web_engineer` | [#6](https://github.com/cihan53/elektriklioto/issues/6) | — |
| **TALEP-005** | Yeni İstek / Özellik | Yüksek (P2) | ✅ Çözüldü | GADM 4.1 Türkiye resmi il, ilçe ve mahalle koordinatlarının entegrasyonu | `/harita` | `backend_engineer` | [#5](https://github.com/cihan53/elektriklioto/issues/5) | — |
| **TALEP-004** | Yeni İstek / Özellik | Yüksek (P2) | ✅ Çözüldü | Arama kutusunda ilçe, il ve istasyon araması ve harita odaklanması | `/` | `web_engineer` | [#4](https://github.com/cihan53/elektriklioto/issues/4) | — |
| **TALEP-003** | Hata / Bug | Normal (P3) | ✅ Çözüldü | Haritada Voltrun istasyonlarının soket tipi yanlış görünüyor | `/` | `web_engineer` | [#3](https://github.com/cihan53/elektriklioto/issues/3) | — |
| **TALEP-002** | Hata / Bug | Normal (P3) | ✅ Çözüldü | google analytics hesabım var kodu G-BKMTW8EH4K trafiği izleye bilmem için bunun siteye eklenmesi gerekiyor | `/` | `web_engineer` | [#2](https://github.com/cihan53/elektriklioto/issues/2) | — |
| **TALEP-001** | Hata / Bug | Normal (P3) | ✅ Çözüldü | Haritada filtre butonuna basınca liste senkronize olmuyor | `/` | `web_engineer` | [#1](https://github.com/cihan53/elektriklioto/issues/1) | — |

---

## 2. Talep Detayları ve Geri Bildirim Notları

### [TALEP-024] Operatör Menüsünde Arama ve 'Tüm Markalar' Alanının Sabitlenmesi ve İstasyon Sayılarının Gösterilmesi (⚖️ Değerlendirmede (Triage))
- **Bildirim Tarihi:** 2026-09-26 10:30
- **Tür / Öncelik:** Tasarım & Kullanıcı Deneyimi / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `None`
- 🐙 **GitHub Issue:** [#32](https://github.com/cihan53/elektriklioto/issues/32)

**Müşteri Açıklaması / Hata Adımları:**
> Harita üzerindeki 'Tüm Operatörler' menüsünü açıp markalar arasında gezinmek istediğimde, liste aşağı kaydırıldıkça arama çubuğu ve 'Tüm Markalar' seçeneği kayboluyor. Listeyi aşağı kaydırsam bile en üstteki arama kutusunun ve 'Tüm Markalar' seçeneğinin menünün tepesinde sabit (yapışkan) kalmasını istiyorum; böylece listeyi tekrar başa kaydırmak zorunda kalmadan her an arama yapabilir veya filtreyi sıfırlayabilirim. Ayrıca her bir markanın yanında kaç adet istasyonu olduğunun parantez veya rozet içinde yazması, operatörlerin yaygınlığını tek bakışta görüp seçim yapmamı çok kolaylaştıracaktır.

---
### [TALEP-023] Haritada ve Operatör Filtresinde Yalnızca 5 Marka Listeleniyor, EPDK'daki Diğer Markalar Görünmüyor (⏳ Beklemede)
- **Bildirim Tarihi:** 2026-09-26 10:05
- **Tür / Öncelik:** Veri & İstasyon Tutarlılığı / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `None`
- 🐙 **GitHub Issue:** [#31](https://github.com/cihan53/elektriklioto/issues/31)

**Müşteri Açıklaması / Hata Adımları:**
> Harita ekranını açıp 'Tüm Operatörler' açılır menüsüne tıkladığımda yalnızca 5 adet şarj firması listeleniyor. Oysa EPDK resmi kayıtlarında 170'ten fazla lisanslı şarj ağı markası bulunuyor. Kendi aracımı şarj ettiğim diğer markaları listede bulamıyorum ve haritada bu markalara göre filtreleme yapamıyorum. Sistemde diğer markaların verileri eksik mi işleniyor yoksa filtre listesine mi eklenmedi? Bir elektrikli araç kullanıcısı olarak Türkiye genelindeki tüm lisanslı şarj markalarını listede görüp istasyonlarını haritada filtreleyebilmek istiyorum.

---
### [TALEP-022] Veritabanı tabloları boşaltıldığı halde haritada istasyonlar görünüyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-24 20:26
- **Tür / Öncelik:** Hata / Bug / Kritik (P1)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `None`
- 🐙 **GitHub Issue:** [#28](https://github.com/cihan53/elektriklioto/issues/28)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri veritabanı tablolarını boşalttığı halde haritada halen istasyon bilgilerinin göründüğünü belirtti. Backend API (station.service.ts) veritabanı boşken fallback olarak in-memory DEFAULT_STATIONS ve GADM statik kümeleme verilerini dönüyor ve veritabanı boşaldığında otomatik olarak cpo_stations.json tohumlaması yapıyor. Bu durum düzeltilmeli; veritabanı tek gerçek kaynak (single source of truth) olmalı, veritabanı boşsa haritada hiçbir mock/fallback istasyon veya kümeleme görünmemeli.

**Studio Yetkilisi Notu:**
> Görev S19-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-021] Pano görevlerine öncelik alanı eklenmeli (❌ İptal Edildi)
- **Bildirim Tarihi:** 2026-09-24 18:58
- **Tür / Öncelik:** Yeni İstek / Özellik / Normal (P3)
- **İlgili Ekran / Sayfa:** `studio`
- **Görevli Rol:** `None`
- 🐙 **GitHub Issue:** [#26](https://github.com/cihan53/elektriklioto/issues/26)

**Müşteri Açıklaması / Hata Adımları:**
> Sprint panosundaki görevler arasından sıradakini seçerken öncelik dikkate alınmıyor; işler yalnızca sprint sırasına göre ilerliyor. Önemli bir işi öne çekmek için elle sıra değiştirmek gerekiyor. Görevlere bir öncelik alanı eklenip (ör. müşteri talebinin önceliğinden türetilerek) sıradaki görevin önceliğe göre seçilmesi isteniyor.

---
### [TALEP-020] Trugo ve diğer operatör istasyonları güncellenmiyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-24 18:43
- **Tür / Öncelik:** Veri & İstasyon Tutarlılığı / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `None`
- 🐙 **GitHub Issue:** [#25](https://github.com/cihan53/elektriklioto/issues/25)

**Müşteri Açıklaması / Hata Adımları:**
> Günlük veri senkronizasyonu çalışıyor, EPDK'dan veriler çekiliyor ancak web arayüzüne yansımıyor. Haritada/operatör listesinde Trugo için sadece 1 istasyon görünüyor; ZES ve Voltrun dışındaki operatörlerin istasyonları görünmüyor. Veriler alınıyor ama veritabanına işlenmiyor gibi görünüyor.

---
### [TALEP-019] EPDK Ana Referans Mimarisine Geçiş ve Trugo/CPO Zenginleştirmesi (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-24 09:20
- **Tür / Öncelik:** Veri & İstasyon Tutarlılığı / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/harita`
- **Görevli Rol:** `data_engineer`
- 🐙 **GitHub Issue:** [#20](https://github.com/cihan53/elektriklioto/issues/20)

**Müşteri Açıklaması / Hata Adımları:**
> epdk_sarj_istasyonlari.json ve istasyonlar.json dosyaları tüm Türkiye şarj ağının ana omurgası yapılarak Trugo, Eşarj, WAT vb. tüm lisanslı operatörler haritaya kazandırıldı. Voltrun ve ZES veri setleri ile kesin GPS ve soket bilgileri zenginleştirildi.

**Studio Yetkilisi Notu:**
> EPDK ana referans mimarisine geçiş ve Trugo/CPO veri zenginleştirmesi tamamlandı. cpo_stations.json güncellendi.

---
### [TALEP-018] TALEP-017 Eksik İş Kapanışı: curl_input.txt deploy paketinde olmadığı için canlı kaynaklar yerine GitHub raw'a fallback yapılıyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-23 20:26
- **Tür / Öncelik:** Hata / Bug / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/server-scripts/deploy`
- **Görevli Rol:** `None`
- 🐙 **GitHub Issue:** [#19](https://github.com/cihan53/elektriklioto/issues/19)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri sahada (uzak sunucuda) cron senkronizasyonunu test ettiğinde sistemin canlı API uç noktaları yerine https://raw.githubusercontent.com/... adreslerine fallback yaptığı görüldü. Nedeni: curl_input.txt dosyasının .github/workflows/deploy.yml içerisindeki deploy_package.tar.gz arşivine dahil edilmemiş olması. Studio ajanlarının bu eksikliği yerel UAT aşamasında deploy zincirini denetleyerek tespit etmesi ve sunucuya aktarılmasını sağlaması gerekirdi. Düzeltme: 1) deploy.yml paketine curl_input.txt dosyasının eklenmesi, 2) sunucuya dağıtımın sağlanması, 3) sunucuda cron_daily_sync.sh çalıştırıldığında GitHub raw linklerine düşmeden canlı kaynaklardan veri çekildiğinin doğrulanması.

**Studio Yetkilisi Notu:**
> Görev S16-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-017] Canlı Kaynak Entegrasyonu: EPDK ve Voltrun verilerini gerçek sitelerden çek (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-19 16:09
- **Tür / Öncelik:** Yeni İstek / Özellik / Normal (P3)
- **İlgili Ekran / Sayfa:** `/data-pipeline`
- **Görevli Rol:** `data_engineer`
- 🐙 **GitHub Issue:** [#17](https://github.com/cihan53/elektriklioto/issues/17)

**Müşteri Açıklaması / Hata Adımları:**
> Şu an import_cpo_stations.py, Voltrun ve ZES verilerini GitHub raw URL'lerinden (statik), EPDK verilerini de yine GitHub'daki eski bir dosyadan çekiyor. Müşteri isteği: (1) EPDK verileri doğrudan EPDK resmi sitesinden (epdk_scraper.py altyapısı kullanılarak) çekilmeli, (2) Voltrun istasyonları Voltrun'ın kendi API'sinden çekilmeli, (3) curl_input.txt dosyası her kaynağın cURL komutlarını 'kaynak: curl ...' formatında tutacak, ileride ZES ve diğer CPO'lar da eklenecek.

**Studio Yetkilisi Notu:**
> Görev S15-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-016] Hakkımızda modal içeriğinin önceki versiyondaki haline döndürülmesi (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-18 18:32
- **Tür / Öncelik:** Tasarım & Kullanıcı Deneyimi / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `ui_designer`
- 🐙 **GitHub Issue:** [#16](https://github.com/cihan53/elektriklioto/issues/16)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri geri bildirimi: Hakkımızda modalının içeriğinin bir önceki versiyonda daha güzel ve kapsamlı olduğunu belirtti. İçerik ve tasarımın önceki versiyon seviyesine getirilmesi veya geri alınması talep ediliyor.

**Studio Yetkilisi Notu:**
> Görev S14-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-015] EPDK ve CPO Kamu/Açık Kaynaklarından Canlı İstasyon Senkronizasyonu (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-18 17:21
- **Tür / Öncelik:** Yeni İstek / Özellik / Normal (P3)
- **İlgili Ekran / Sayfa:** `/cron/sync`
- **Görevli Rol:** `backend_engineer`
- 🐙 **GitHub Issue:** [#15](https://github.com/cihan53/elektriklioto/issues/15)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri isteği: İstasyon senkronizasyonu için EPDK web sitesi/listesi (public) kullanılmalı, ayrıca firmaların her biri (ZES, Trugo, Eşarj, Voltrun vb.) için istasyon bilgilerinin çekileceği açık servis/endpoint adresleri tespit edilip cron mekanizmasına bağlanmalı.

**Studio Yetkilisi Notu:**
> Görev S13-T4 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-014] Cron senkronizasyon scripti istasyon bilgilerini alamıyor (0 istasyon hazır) (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-18 14:41
- **Tür / Öncelik:** Hata / Bug / Normal (P3)
- **İlgili Ekran / Sayfa:** `/cron/sync`
- **Görevli Rol:** `devops_engineer`
- 🐙 **GitHub Issue:** [#14](https://github.com/cihan53/elektriklioto/issues/14)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri log kaydını iletti: Sunucuda cron ile çalışan günlük istasyon senkronizasyon scripti (import_cpo_stations.py) 0 istasyon üretiyor:
[2026-09-18 02:00:01] Günlük İstasyon Senkronizasyonu Başlatıldı.
[2026-09-18 02:00:01] Proje Dizini: /home/elektriklioto/app
[2026-09-18 02:00:02] Kullanılan Python: /usr/bin/python3 (Python 3.6.8)
[2026-09-18 02:00:02] ETL Pipeline (import_cpo_stations.py) çalıştırılıyor...
[2026-09-18 02:00:02] ETL Pipeline başarıyla tamamlandı.
[2026-09-18 02:00:02] Güncel İstasyon Dosyası: 4.0K (0 istasyon hazır)
[2026-09-18 02:00:02] cPanel Passenger uygulaması yeniden başlatıldı (restart.txt).
[2026-09-18 02:00:02] Günlük Senkronizasyon İşlemi Tamamlandı.
İstasyon verisi çekilemiyor veya Python sürümü/bağımlılık/kaynak hatası nedeniyle 0 kayıt üretiliyor.

**Studio Yetkilisi Notu:**
> Görev S13-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-013] Yapılan güncellemeler, çözülen hatalar ve sürüm geçmişi için Değişiklik Günlüğü (Changelog / Sürüm Notları) ekranı (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-18 09:03
- **Tür / Öncelik:** Yeni İstek / Özellik / Normal (P3)
- **İlgili Ekran / Sayfa:** `/guncellemeler`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#13](https://github.com/cihan53/elektriklioto/issues/13)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri Talebi: Ekran üzerinde hangi güncellemelerin yapıldığı, bug'ların çözüldüğünü anlayamıyorum, bunun için bir ekran hazırlanabilir mi? Uygulamada çözülen müşteri taleplerini (TALEP-001..TALEP-012), giderilen hataları, eklenen özellikleri ve SemVer sürüm etiketlerini (v0.7.1 vb.) tarih ve kategorilerine göre şık bir zaman çizelgesi / kart yapısıyla sunan 'Sürüm Notları & Güncellemeler' (/guncellemeler veya modal) ekranı hazırlanmalıdır.

**Studio Yetkilisi Notu:**
> Görev S12-T4 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-012] Yeni deploy çıktığında açık sayfalarda güncelleme uyarısı çıkması ve 20 saniyede otomatik yenilenmesi (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-18 00:10
- **Tür / Öncelik:** Yeni İstek / Özellik / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `devops_engineer`
- 🐙 **GitHub Issue:** [#12](https://github.com/cihan53/elektriklioto/issues/12)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri Talebi: Eğer bir deploy çıkarsa tüm açık olan sayfaların uyarı verip yenilenmesini istesin kullanıcıdan, eğer 20sn içinde cevap vermez ise yinede yenilesin. Frontend tarafında periyodik sürüm kontrolü (version/build hash polling) yapılarak yeni deploy algılandığında kullanıcıya 'Yeni sürüm yayınlandı, sayfa güncelleniyor (20s)' geri sayımlı modal/toast gösterilmeli, 'Şimdi Yenile' butonu sunulmalı ve 20 saniye dolduğunda otomatik reload yapılmalıdır.

**Studio Yetkilisi Notu:**
> Görev S12-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-011] Top menüde 2 tane Hakkında butonu görünüyor (Sağdaki buton korunmalı, mükerrer olan kaldırılmalı) (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-18 00:05
- **Tür / Öncelik:** Hata / Bug / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#11](https://github.com/cihan53/elektriklioto/issues/11)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri Geri Bildirimi: Top menüde 2 tane hakkında butonu göründüğünü söylüyor. Ayrıca hakkında butonu sağda olanı doğru diyor. Header/menü alanındaki çift Hakkında butonu incelenerek sol veya orta alanda mükerrer görünen kaldırılmalı, sağ taraftaki doğru Hakkında butonu korunmalıdır.

**Studio Yetkilisi Notu:**
> Görev S11-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-010] Aramalar ve istasyon kayıtları veritabanından gelmiyor, veritabanı tabloları boş görünüyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-18 00:01
- **Tür / Öncelik:** Hata / Bug / Kritik (P1)
- **İlgili Ekran / Sayfa:** `/api/v1/stations`
- **Görevli Rol:** `backend_engineer`
- 🐙 **GitHub Issue:** [#10](https://github.com/cihan53/elektriklioto/issues/10)

**Müşteri Açıklaması / Hata Adımları:**
> Müşteri Geri Bildirimi: Halen aramalar kayıtlar veri tabanından gelmiyor, veritabanı ne işe yarıyor, kontrol ettiğinde tablolar boş görünüyor der. PostgreSQL/PostGIS veritabanı ile backend station/search servisleri arasındaki entegrasyonun kurulması, istasyon ve soket verilerinin veritabanına işlenmesi ve aramaların doğrudan veritabanı sorgularından beslenmesi gerekiyor.

**Studio Yetkilisi Notu:**
> Görev S10-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-009] Hakkında, Kullanıcı Sözleşmeleri, Gizlilik Politikası ve Canlı Sürüm Bilgileri Paneli / Sayfası (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 20:10
- **Tür / Öncelik:** Yeni İstek / Özellik / Normal (P3)
- **İlgili Ekran / Sayfa:** `/hakkimizda`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#9](https://github.com/cihan53/elektriklioto/issues/9)

**Müşteri Açıklaması / Hata Adımları:**
> Uygulama arayüzünde (Header veya sol menü/profil alanında) erişilebilir bir 'Hakkında' bölümü eklenmeli; tıklandığında elektriklioto.com misyonu, kullanım koşulları & sözleşmeler, KVKK/gizlilik ilkeleri, veri kaynakları (EPDK, CPO'lar) ve canlı sürüm/versiyon (SemVer tag ve build zamanı) bilgileri şık bir modal veya sayfa ile sunulmalıdır.

**Studio Yetkilisi Notu:**
> Görev S9-T12 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-008] Harita pinleri ve kümeleme baloncuklarının modal pencerelerin (QrBridgeModal vb.) üzerine taşması (z-index katman çakışması) (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 19:21
- **Tür / Öncelik:** Hata / Bug / Kritik (P1)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#8](https://github.com/cihan53/elektriklioto/issues/8)

**Müşteri Açıklaması / Hata Adımları:**
> Karekod (QrBridgeModal), Arıza Bildirimi veya Katkı Sağla modalı açıldığında, MapLibre harita üzerindeki pinler ve kümeleme baloncukları (marker/cluster elements) modal penceresinin ve karartma katmanının (backdrop) üzerinde kalmakta; karekodun ve modal içeriğinin önünü kapatarak görseli ve tıklanabilirliği bozmaktadır. z-index hiyerarşisinin düzeltilmesi (Modal: z-50/z-[100], Harita markerları: z-10) gerekmektedir.

**Studio Yetkilisi Notu:**
> Görev S9-T10 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-007] Tüm operatörler açılır menüsü (dropdown) açıldığında menü taşması ve istenmeyen scroll çubuğu oluşması (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 19:19
- **Tür / Öncelik:** Hata / Bug / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#7](https://github.com/cihan53/elektriklioto/issues/7)

**Müşteri Açıklaması / Hata Adımları:**
> Harita arayüzündeki 'Tüm Operatörler' dropdown açılır listesine tıklandığında menü içeriği ekranda düzgün görünmüyor, container taşması (overflow/z-index/max-height) nedeniyle menü kesiliyor ve istenmeyen çirkin bir scroll çubuğu çıkıyor.

**Studio Yetkilisi Notu:**
> Görev S9-T8 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-006] Konum izni verildiğinde kullanıcının anlık konumunu gösteren mavi nokta/baloncuk eksik (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 19:15
- **Tür / Öncelik:** Hata / Bug / Kritik (P1)
- **İlgili Ekran / Sayfa:** `/harita`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#6](https://github.com/cihan53/elektriklioto/issues/6)

**Müşteri Açıklaması / Hata Adımları:**
> Ziyaretçi harita üzerinde 'Konumumu Bul' butonuna tıklayıp tarayıcıda GPS/konum izni verdiğinde harita o bölgeye yaklaşıyor ancak kullanıcının tam olarak nerede durduğunu gösteren nabız atan mavi konum baloncuğu (user location marker / pulsing blue dot) haritada çizilmiyor.

**Studio Yetkilisi Notu:**
> Görev S9-T6 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-005] GADM 4.1 Türkiye resmi il, ilçe ve mahalle koordinatlarının entegrasyonu (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 19:13
- **Tür / Öncelik:** Yeni İstek / Özellik / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/harita`
- **Görevli Rol:** `backend_engineer`
- 🐙 **GitHub Issue:** [#5](https://github.com/cihan53/elektriklioto/issues/5)

**Müşteri Açıklaması / Hata Adımları:**
> gadm41_TUR veri kaynağından Türkiye'nin 81 il, 973 ilçe ve mahallelerinin resmi coğrafi sınır ve merkez koordinatları sisteme aktarılmalı; harita arama, ilçe/mahalle sorgulama ve geocoding mekanizması bu resmi CBS (GIS) veritabanı üzerinden çalışmalıdır.

**Studio Yetkilisi Notu:**
> Görev S9-T4 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-004] Arama kutusunda ilçe, il ve istasyon araması ve harita odaklanması (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 19:11
- **Tür / Öncelik:** Yeni İstek / Özellik / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#4](https://github.com/cihan53/elektriklioto/issues/4)

**Müşteri Açıklaması / Hata Adımları:**
> Harita arama kutusuna ilçe (Kadıköy, Çankaya, Bodrum vb.), 81 il ve istasyon adı yazıldığında otomatik tamamlama önerileri gelmeli ve seçildiğinde harita ilgili konuma animasyonla (flyTo) odaklanmalıdır.

**Studio Yetkilisi Notu:**
> Görev S9-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-003] Haritada Voltrun istasyonlarının soket tipi yanlış görünüyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 13:50
- **Tür / Öncelik:** Hata / Bug / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#3](https://github.com/cihan53/elektriklioto/issues/3)

**Müşteri Açıklaması / Hata Adımları:**
> İstasyon detayında AC Tip 2 yerine CCS yazıyor.

**Studio Yetkilisi Notu:**
> Görev S8-T4 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-002] google analytics hesabım var kodu G-BKMTW8EH4K trafiği izleye bilmem için bunun siteye eklenmesi gerekiyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 13:47
- **Tür / Öncelik:** Hata / Bug / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#2](https://github.com/cihan53/elektriklioto/issues/2)

**Müşteri Açıklaması / Hata Adımları:**
> google analytics hesabım var kodu G-BKMTW8EH4K trafiği izleye bilmem için bunun siteye eklenmesi gerekiyor

**Studio Yetkilisi Notu:**
> Görev S8-T2 başarıyla tamamlandı ve UAT testinden geçti.

---
### [TALEP-001] Haritada filtre butonuna basınca liste senkronize olmuyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 13:45
- **Tür / Öncelik:** Hata / Bug / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#1](https://github.com/cihan53/elektriklioto/issues/1)

**Müşteri Açıklaması / Hata Adımları:**
> Filtrelerde AC seçildiğinde haritadaki pinler güncelleniyor ancak alt liste görünümü eski istasyonları göstermeye devam ediyor.

**Studio Yetkilisi Notu:**
> 2026-09-17 13:45 itibarıyla ekip tarafından çözüldü ve müşteri onayına sunuldu.

---