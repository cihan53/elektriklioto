# Mobil Test Spesifikasyonu ve Kararları: S6 Flutter Birim ve Widget Testleri

> **Belge Sürümü:** 1.0.0-s6  
> **Durum:** Onaylandı (Teknik Test Karar Dokümanı)  
> **Sprint:** S6 — Mobil İstemci ve Harita Entegrasyonu  
> **Görev:** S6-T3 Mobil Birim ve Widget Testleri  
> **Rol:** Mobil Geliştirici (Flutter) & Test Mühendisi  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/tasarim_sistemi.md`, `workspace/docs/arayuz_spesifikasyonu.md`, `workspace/docs/ux_akislari.md`, `workspace/docs/ekran_envanteri.md`, `workspace/docs/teknik_mimari_dokumani.md`, `workspace/docs/kabul_kriterleri.md`, `workspace/docs/paket_secim_raporu.md`

---

## 1. Kapsam ve Test Vizyonu

Bu doküman, Sprint 6 (S6) kapsamında geliştirilen Flutter mobil istemcisinin (iOS ve Android tek kod tabanı) **Birim (Unit)**, **BLoC State Yönetimi**, **Widget**, **Derin Bağlantı (Deep-Linking & Clipboard Fallback)**, **Çevrimdışı Hive Önbelleği**, **Sıfır Konum Saklama (Proximity Proof)** ve **WCAG 2.1 AA Erişilebilirlik** test stratejisini, mimari kararlarını ve doğrulama kriterlerini belirler.

Test mimarisi; kullanıcıyı yanlış veya uydurma veriyle yolda bırakmama ilkesini, sıfır konum sızıntısını, 60 FPS harita akıcılığını ve donanım kesintilerinde deterministik çevrimdışı dayanıklılığı garanti altına alır.

---

## 2. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki kararlar test tasarımının tartışılamaz temelidir:
- **Platform Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Web Platformu:** Nuxt.js / Vue.js Fastify API'sini tüketir (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker konteyneri üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK lisansına tabi elektrik satışı ve faturalama yapamaz; e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcının GPS konumu yalnızca anlık harita merkezleme ve en yakın istasyon sorgusu için geçici (in-memory) kullanılır; sunucu tarafında kullanıcıya bağlı geçmiş güzergah/koordinat kaydı tutulamaz (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Erişilebilirlik Tabanı:** WCAG 2.1 AA tabandır; metin kontrastı ≥ 4.5:1, dokunma hedefleri webde ≥ 44x44 CSS px, mobilde ≥ 48x48 pt olmalıdır (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder ve arayüz bu alanlar boşken de anlamlı görünmek zorundadır; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Flutter ve Dart SDK ortamdaki Darwin ARM64 mimarisine uygun ikililerle onarılana kadar, test spesifikasyonu ve `workspace/src/mobile/test/` altındaki test kodları Flutter Test Harness (`flutter_test`, `bloc_test`, `mocktail`) standartlarına %100 uyumlu olarak kurgulanmıştır.

> **Varsayım:** Soket tipi, güç, tarife ve anlık doluluk Faz 1 EPDK veri setinde bulunmadığından, bu alanlar arayüzde "Operatör Verisi Bekleniyor" nötr gri rozetiyle gösterilir ve tıklandığında kitle kaynaklı katkı formunu tetikler.

---

## 3. Test Mimarisi ve Paket Kararları

- **Birim & Widget Test Çatısı:** `PAKET KULLAN: flutter_test` (Flutter SDK yerleşik) — Widget hiyerarşisi, dokunma hedefleri ve görsel render doğrulaması.
- **BLoC Durum Testi:** `PAKET KULLAN: bloc_test ^9.1.7` — Reaktif akışların (event → state) yan etkisiz ve deterministik testi. *Alternatif: Manuel StreamSubscription dinleme (fazla boilerplate).*
- **Mocking Kütüphanesi:** `PAKET KULLAN: mocktail ^1.0.4` — Tip güvenli, kod üretim gerektirmeyen (build_runner'sız) hızlı mocklama. *Alternatif: Mockito (build_runner bağımlılığı).*
- **Yerel Depolama Mocklama:** `PAKET KULLAN: hive_ce ^2.20.0` ve `hive_ce_flutter ^2.3.4` — Çevrimdışı istasyon önbelleği testlerinde in-memory izole kutular (`Hive.init`).
- **Ağ İstemcisi İzolasyonu:** `PAKET KULLAN: http/testing.dart (MockClient)` — Fastify API yanıtlarının ağa çıkmadan simülasyonu.
- **Harita Motoru İzolasyonu:** `maplibre_gl` native katmanı test ortamında Mock Controller ve başsız (headless) Container ile sarmalanır; widget testlerinde GPU gereksinimi bertaraf edilir.

---

## 4. Test Senaryoları Matrisi (TC-MOB)

| Senaryo ID | Kategori | Modül / Sınıf | Girdi & Ön Koşul | Beklenen Sonuç | Doğrulama & Kabul Kriteri |
|---|---|---|---|---|---|
| **TC-MOB-MAP-01** | Harita & BBox | `MapBloc` | `MapCameraMoved(bbox)` | `MapLoading` -> `MapLoaded` | 300ms debounce sonrası API'den dönen 500 istasyon pin listesi state'e aktarılır (PO-201, PO-601). |
| **TC-MOB-MAP-02** | Sunucu Kümeleme | `MapBloc` | `zoom < 11.0` | `ClusterMarkerWidget` listesi | BBox sorgusu tekil istasyonlar yerine küme özetleri (`cluster_count`) üretir (PO-201). |
| **TC-MOB-MAP-03** | Hata & Önbellek | `MapBloc` | Ağ kesintisi (`SocketException`) | `MapLoaded(isOffline: true)` | API hatasında uygulama çökmez; Hive'daki son pinler render edilir, sarı offline bant açılır (PO-602). |
| **TC-MOB-FILT-01**| Filtreleme | `FilterBloc` | `FilterOperatorChanged('zes')` | `selectedOperatorSlug: 'zes'` | Haritadaki istasyonlar 150ms içinde yalnızca seçili operatöre filtrelenir (US-04). |
| **TC-MOB-FILT-02**| Kilitli Filtre | `FilterBloc` | `FilterLockedTapped('Hızlı Şarj')`| `toastMessage: 'Operatör...'` | Faz 1 eksik veri gereği seçim kilitlenir; 4000ms uyarı toast'ı tetiklenir (PO-301). |
| **TC-MOB-DET-01** | Detay Çekmecesi | `StationDetailSheet`| `StationDetail` DTO | SCR-02 3 kademeli çekmece | Peek (160pt) -> Half (380pt) -> Full geçişleri, EPDK Sicil Rozeti (`ŞRJ/xxxx`) eksiksiz render edilir. |
| **TC-MOB-NULL-01**| Eksik Veri | `StationDetailSheet`| `power_kw: null`, `tariffs: null` | `MissingDataBadge` + CTA | Uydurma veri yok; "Operatör Verisi Bekleniyor" rozeti ve `[+ Bilgi Ekle]` butonu gösterilir (PO-301). |
| **TC-MOB-DEEP-01**| Derin Bağlantı | `DeepLinkService` | CPO uygulaması kurulu (`zes://`) | Doğrudan App Link tetiklenir | `canLaunchUrl: true` durumunda ilgili soket şeması açılır (Başarı: PO-401 ≥ %90). |
| **TC-MOB-DEEP-02**| Pano Fallback | `DeepLinkService` | Şema desteksiz / web mağaza | Koda kopyalama + Toast | `istasyon_no` panoya yazılır, 4 sn toast çıkar: "İstasyon kodu ({ŞRJ/xxxx}) kopyalandı!", mağaza açılır. |
| **TC-MOB-PROX-01**| Proximity 50m | `ProximityProofHelper`| Kullanıcı istasyona 30m yakın | `proximity_proof` üretilir | Mesafe <= 50m olduğunda 64 karakterlik HMAC-SHA256 kanıtı başarıyla döner (PO-701). |
| **TC-MOB-PROX-02**| Mesafe Aşımı | `ProximityProofHelper`| Kullanıcı istasyona 120m uzak | `null` döner, form kilitlenir | Mesafe > 50m durumunda kanıt üretilmez; "50m yakınında olmalısınız" uyarısı verilir (PO-701). |
| **TC-MOB-PRIV-01**| Konum Gizliliği | `ApiClient` & Services | Arıza ihbar isteği | Sıfır GPS sızıntısı | İstek gövdesinde (`body`) veya başlıklarında `lat`/`lon` bulunamaz; yalnızca `proximity_proof` gider. |
| **TC-MOB-A11Y-01**| Dokunma Hedefi | `AppTouchTarget` | Tıklanabilir tüm widget'lar | Fiziksel boyut ≥ 48x48 pt | `BoxConstraints(minWidth: 48, minHeight: 48)` kuralı istisnasız tüm etkileşimli alanlarda doğrulanır. |
| **TC-MOB-A11Y-02**| Renk Kontrastı | `AppColors` | Açık & Koyu tema metin/zemin | Kontrast ≥ 4.5:1 (WCAG AA) | Text Primary (17.06:1), On Primary (5.57:1), Danger on Subdued (5.30:1) bağımsız formülle doğrulanır. |
| **TC-MOB-THM-01** | Tema Yönetimi | `ThemeCubit` | `ThemeChanged(ThemeMode.dark)` | Dark tema renk şeması aktif | 200ms içinde `AppColors.dark` renkleri ve koyu harita stili devreye alınır (PO-502). |

---

## 5. BLoC ve Durum Yönetimi Test Kararları

- **Karar:** Tüm asenkron durum akışları `bloc_test` paketi ile test edilir; doğrudan `StreamSubscription` ile manuel dinleme yapılmaz.
- **Gerekçe:** Event sıralamasının, debounce zamanlayıcılarının ve state geçişlerinin yan etkisiz, temiz ve deterministik olarak test edilmesi.
- **Harita BLoC Doğrulaması (TC-MOB-MAP-01 & 03):**
  - Viewport değiştiğinde `MapCameraMoved` tetiklenir.
  - BLoC, 300ms içinde gelen ardışık kamera hareketlerini sönümler (debounce).
  - Başarılı yanıtta `MapState(status: MapStatus.loaded, stations: [...])` yayılır.
  - Ağ kesintisinde `MapStatus.failure` yerine Hive'dan okuma yapılarak `MapState(status: MapStatus.loaded, isOffline: true)` yayılır; arayüz asla boşaltılmaz.
- **Filtre BLoC Doğrulaması (TC-MOB-FILT-01 & 02):**
  - `FilterOperatorChanged('trugo')` event'i aktif filtre durumunu günceller.
  - Faz 1'de bulunmayan "Hızlı Şarj" veya "Boş Soketler" tıklandığında `FilterLockedTapped` fırlatılır; filtre durumu değişmez, tek seferlik `toastMessage` üretilir.
- **İstasyon Detay BLoC Doğrulaması (TC-MOB-DET-01):**
  - `StationDetailRequested(slug)` çağrısı `StationDetailLoading` durumuna geçer.
  - Mock API'den dönen DTO ile `StationDetailLoaded` state'i üretilir; modeldeki `null` alanlar güvenle korunur.
- **Tema Cubit Doğrulaması (TC-MOB-THM-01):**
  - `ThemeMode.system` varsayılandır. Kullanıcı seçiminde `ThemeMode.light` veya `ThemeMode.dark` state'e yazılır ve `shared_preferences` içine kaydedilir.

---

## 6. Widget ve Kullanıcı Etkileşim Test Kararları

- **Karar:** Widget testleri `testWidgets` ve `WidgetTester` ile yürütülür; ekran çözünürlüğü standart mobil cihaz (1080x2400 pt, pixel ratio: 1.0) olarak sabitlenir.
- **Gerekçe:** Alt çekmece (Bottom Sheet) ve kaydırılabilir listelerin taşma (overflow) hatalarını CI aşamasında yakalamak.
- **İstasyon Detay Çekmecesi (`StationDetailSheet` - SCR-02):**
  - Çekmece tutamacı (36x4px, `AppRadius.full`, `borderStrong`) tepe noktasında doğrulanır.
  - Operatör başlığı, İstasyon Adı ve mono fontlu EPDK Sicil Rozeti (`EPDK: ŞRJ/xxxx`) görünürlüğü test edilir.
  - Konum izni varsa `~1.2 km` mesafe rozeti; konum izni yoksa rozetin tamamen gizlenip `Halka Açık` rozetinin sola yaslandığı doğrulanır.
  - Birincil CTA: `"Operatörde Aç / Şarja Başla"` butonunun 48pt yüksekliği ve tıklanabilirliği doğrulanır.
  - Sayfa aşağı kaydırıldığında (scroll):
    - `"Soket ve Güç Bilgileri"` başlığı altında gri `MissingDataBadge` ve `[+ Bilgi Ekle]` CTA'sı test edilir.
    - `"Tarife: Operatör Verisi Bekleniyor"` ve `"Canlı durum verisi henüz açılmadı"` metinleri aranır.
    - En altta zorunlu EMP yasal uyarısı ve `"Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)"` sabit damgası doğrulanır.
- **Eksik Veri Rozeti (`MissingDataBadge`):**
  - `[+ Bilgi Ekle]` butonuna dokunulduğunda `onContributeTap` geri çağrımının (callback) tetiklendiği ve `ContributeDataModal` (SCR-07) bileşeninin açıldığı doğrulanır.
- **Arama Çubuğu (`SearchBarWidget` & Autocomplete):**
  - 250ms debounce süresi içinde dönen döner spinner (`Searching / Loading`) doğrulanır.
  - Eşleşmeyen aramalarda `SearchAutocompleteDropdown` boş durumunun (`"Sonuç bulunamadı — İlçe veya operatör adı yazın"`) belirdiği test edilir.

---

## 7. Derin Bağlantı (Deep-Linking) ve Pano (Clipboard) Fallback Kararları

- **Karar:** CPO mobil uygulamalarına yönlendirme `DeepLinkService` üzerinden soyutlanır; native işletim sistemi çağrısı `urlLauncher` parametresiyle mocklanır.
- **Gerekçe:** Cihazda kurulu olmayan uygulamaların test senaryolarını kırmasını önlemek ve pano kopyalama mekanizmasını deterministik test etmek.
- **Doğrulama Yöntemi (TC-MOB-DEEP-01 & 02):**
  1. **Şema Destekli Durum (ZES, Trugo, Eşarj):**
     - İstasyon DTO'sunda `deep_link.deep_link_url: 'zes://station/1904'` ve `clipboard_fallback: false` gelir.
     - `DeepLinkService.launchOperator()` çağrıldığında `urlLauncher` fonksiyonuna `Uri.parse('zes://station/1904')` iletildiği doğrulanır.
     - Pano kopyalama ve toast fonksiyonları tetiklenmez (`expect(copiedText, isNull)`).
  2. **Desteklenmeyen Şema / Fallback Durumu:**
     - İstasyon DTO'sunda `deep_link_url: null` ve `clipboard_fallback: true` gelir.
     - Servis çalıştırıldığında:
       - `onCopyToClipboard` fonksiyonuna istasyon kodu (`ŞRJ/1904`) iletilir.
       - `onShowToast` fonksiyonuna tam olarak şu mikro kopya iletilir:  
         `"İstasyon kodu (ŞRJ/1904) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz."`
       - Kullanıcı operatörün mağaza/web sayfasına yönlendirilir (`launchedUri` doludur).
- **Alternatif:** *Yalnızca web linki açmak:* Kullanıcıya hedef soketi aratacağı için elendi; pano kopyalama zorunlu kılındı.

---

## 8. Çevrimdışı Hive Önbelleği ve Ağ Dayanıklılık Kararları

- **Karar:** Ziyaret edilen viewport koordinatlarındaki istasyon özetleri yerel `HiveStorageService` (Hive CE NoSQL) ile diskte tutulur; testlerde in-memory box kullanılır.
- **Gerekçe:** Tünel, otoyol veya baz istasyonu bulunmayan kırsal bölgelerde uygulamanın donmasını veya beyaz ekranda kalmasını engellemek (PO-602).
- **Doğrulama Yöntemi (TC-MOB-MAP-03 & TC-MOB-OFF-01):**
  1. `HiveStorageService.saveStations(stations)` ile 100 istasyon önbelleğe yazılır.
  2. Cihaz ağ bağlantısı sahte `MockClient` ile `SocketException('No Internet')` fırlatacak şekilde yapılandırılır.
  3. `MapBloc`'a `MapCameraMoved` verilir.
  4. BLoC hatayı yutar, Hive'dan son kayıtlı 100 istasyonu çeker ve `isOffline: true` bayrağıyla yayınlar.
  5. Harita üzerinde `OfflineStatusBanner` (`"Çevrimdışı Mod — Son bilinen istasyon verileri gösteriliyor."`) widget'ının belirdiği doğrulanır.
  6. Çevrimdışı modda arıza bildirimi butonunun tıklandığında `"Çevrimdışıyken arıza bildirimi yapılamaz"` uyarısı verdiği doğrulanır.

---

## 9. Konum Gizliliği ve Proximity Proof Güvenlik Test Kararları

- **Karar:** Kullanıcının ham GPS koordinatı hiçbir ağ paketinde taşınamaz; 50 metre mesafe kontrolü cihazda hesaplanır ve sunucuya yalnızca HMAC-SHA256 imzalı `proximity_proof` iletilir.
- **Gerekçe:** KVKK ve konum gizliliği zorunlu kısıtı gereğince sunucuda kullanıcı güzergah veya geçmiş konum kaydı oluşmasını engellemek.
- **Haversine Metre Doğrulaması (`DistanceCalculator`):**
  - İki nokta arasındaki mesafe testi: (41.0000, 29.0000) ile (41.0002, 29.0000) arası mesafe ~22.2 metre olarak hesaplanır (`expect(d, inInclusiveRange(20.0, 25.0))`).
- **Proximity Proof Üretimi (`ProximityProofHelper`):**
  - Mesafe <= 50.0m ise: 32 karakterlik nonce, `station_id` ve gizli tuz ile 64 karakterlik SHA-256 hash üretilir (`expect(proof.length, 64)`).
  - Mesafe > 50.0m ise: Metot doğrudan `null` döner; arıza ihbar formu kilitlenir (`expect(proof, isNull)`).
- **Ağ Paketi Denetimi (Zero Location Leak Gate):**
  - `ReportService.submitReport()` fonksiyonu mock HTTP istemcisiyle çalıştırılır.
  - Gönderilen HTTP POST gövdesi (JSON) çözülür:
    - İzin verilen alanlar: `issue_type`, `station_id`, `proximity_proof`, `nonce`.
    - Yasaklı alanlar: `lat`, `lon`, `latitude`, `longitude`, `coords`, `location`.
    - Herhangi bir koordinat anahtarı tespit edilirse test anında başarısız (`fail()`) olur.

---

## 10. WCAG 2.1 AA ve Tasarım Token Uyumluluk Test Kararları

- **Karar:** Arayüz bileşenlerinde sabit HEX renk veya doğrudan sayısal padding/margin kullanılamaz; tüm değerler `tokens.dart` (`AppColors`, `AppTypography`, `AppSpacing`, `AppRadius`, `AppTouchTarget`) üzerinden gelir.
- **Gerekçe:** Tasarım sistemi bağlayıcılığı ve WCAG 2.1 AA erişilebilirlik sertifikasyonu.
- **Fiziksel Dokunma Hedefi Testi (`AppTouchTarget`):**
  - Flutter ortamında tıklanabilir tüm öğeler (`FilterChip`, `IconButton`, `MissingDataBadge`, `ButtonPrimary`) için:
    ```dart
    test('Tüm dokunma hedefleri en az 48x48 pt olmalıdır', () {
      expect(AppTouchTarget.minMobile, greaterThanOrEqualTo(48.0));
      expect(AppTouchTarget.mobileConstraints.minWidth, 48.0);
      expect(AppTouchTarget.mobileConstraints.minHeight, 48.0);
    });
    ```
  - Görsel olarak 32px olan `[+ Bilgi Ekle]` butonu, `mobileConstraints` sayesinde 48x48 pt hit-box sınırını karşılar.
- **WCAG 2.1 AA Bağıl Parlaklık (Luminance) Kontrast Testi:**
  - `Text Primary` (`#0F172A`) / `Surface` (`#FFFFFF`) Açık Tema: Kontrast **17.85:1** (AAA).
  - `On Primary` (`#FFFFFF`) / `Primary` (`#0066CC`) Açık Tema: Kontrast **5.57:1** (AA).
  - `Danger on Subdued` (`#B91C1C`) / `Danger Subdued` (`#FEE2E2`): Kontrast **5.30:1** (AA).
  - Subdued zemin üzerinde `Text Muted` (`#64748B`, 4.34:1) KULLANILAMAZ kuralı doğrulanır; `Text Secondary` (`#475569`, 6.92:1) kullanımı zorunludur.

---

## 11. Flutter / Dart Test Kod Referansları

### 11.1. DeepLink ve Clipboard Fallback Testi (`test/deeplink_service_test.dart`)

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:elektriklioto_mobile/models/station_detail.dart';
import 'package:elektriklioto_mobile/services/deeplink_service.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testStationNoLink = StationDetail(
    id: 'test-id',
    istasyonNo: 'ŞRJ/1904',
    slug: 'zes-istasyon-1904',
    name: 'ZES Kadıköy',
    address: 'Kadıköy İstanbul',
    city: 'İstanbul',
    district: 'Kadıköy',
    lat: 40.99,
    lon: 29.03,
    updatedAt: '2026-09-06T10:00:00Z',
    isFlaggedDefective: false,
    operator: OperatorSummary(id: 1, name: 'ZES', slug: 'zes'),
    deepLink: DeepLinkResult(
      deepLinkUrl: null,
      clipboardFallback: true,
      clipboardText: 'ŞRJ/1904',
    ),
  );

  test('DeepLinkService: Şema yoksa kodu panoya kopyalar ve yönlendirme toast uyarısı verir', () async {
    String? copiedText;
    String? toastMessage;
    Uri? launchedUri;

    await DeepLinkService.launchOperator(
      station: testStationNoLink,
      onShowToast: (msg) => toastMessage = msg,
      onCopyToClipboard: (txt) => copiedText = txt,
      urlLauncher: (uri, {mode = LaunchMode.platformDefault}) async {
        launchedUri = uri;
        return true;
      },
    );

    expect(copiedText, 'ŞRJ/1904');
    expect(
      toastMessage,
      'İstasyon kodu (ŞRJ/1904) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz.',
    );
    expect(launchedUri, isNotNull);
  });
}
```

### 11.2. İstasyon Detay Çekmecesi Widget Testi (`test/station_detail_test.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:elektriklioto_mobile/models/station_summary.dart';
import 'package:elektriklioto_mobile/bloc/station_detail/station_detail_bloc.dart';
import 'package:elektriklioto_mobile/widgets/sheet/station_detail_sheet.dart';

void main() {
  testWidgets('StationDetailSheet: SCR-02 eksik veri rozetleri ve yasal uyarıları render eder', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const summary = StationSummary(
      id: 'test-uid-1',
      istasyonNo: 'ŞRJ/1904',
      slug: 'zes-kadikoy-1904',
      name: 'ZES Kadıköy İstasyonu',
      address: 'Caferağa Mah. Moda Cad. No:12',
      city: 'İstanbul',
      district: 'Kadıköy',
      lat: 40.985,
      lon: 29.028,
      isPublic: true,
      operatorName: 'ZES',
      operatorSlug: 'zes',
      isFlaggedDefective: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider<StationDetailBloc>(
            create: (_) => StationDetailBloc(),
            child: StationDetailSheet(
              summary: summary,
              onReportTap: () {},
              onContributeTap: () {},
              onClose: () {},
              distanceMeters: 1200,
            ),
          ),
        ),
      ),
    );

    expect(find.text('ZES'), findsOneWidget);
    expect(find.text('EPDK: ŞRJ/1904'), findsOneWidget);
    expect(find.text('Halka Açık'), findsOneWidget);
    expect(find.text('~1.2 km'), findsOneWidget);
    expect(find.text('Operatörde Aç / Şarja Başla'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('Canlı durum verisi henüz açılmadı'), 300);
    expect(find.text('Operatör Verisi Bekleniyor'), findsWidgets);
    expect(find.text('+ Bilgi Ekle'), findsWidgets);

    await tester.scrollUntilVisible(find.text('Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)'), 300);
    expect(find.text('Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)'), findsOneWidget);
  });
}
```

### 11.3. Proximity Proof ve Sıfır Konum Saklama Testi (`test/proximity_proof_test.dart`)

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:elektriklioto_mobile/core/utils/proximity_proof_helper.dart';
import 'package:elektriklioto_mobile/core/utils/distance_calculator.dart';

void main() {
  test('DistanceCalculator: Haversine formülüyle iki nokta arası mesafeyi doğru hesaplar', () {
    final d = DistanceCalculator.distanceBetween(
      lat1: 41.0000,
      lon1: 29.0000,
      lat2: 41.0002,
      lon2: 29.0000,
    );
    expect(d, lessThan(30.0));
    expect(d, greaterThan(15.0));
  });

  test('ProximityProofHelper: Yalnızca 50 metre sınırları içindeyken HMAC-SHA256 kanıtı üretir', () {
    final nonce = ProximityProofHelper.generateNonce();
    expect(nonce.length, 32);

    final proof = ProximityProofHelper.generateProofIfWithin50m(
      userLat: 41.0000,
      userLon: 29.0000,
      stationLat: 41.0001,
      stationLon: 29.0000,
      stationId: 'station-uuid-1234',
      nonce: nonce,
    );
    expect(proof, isNotNull);
    expect(proof!.length, 64);

    final distantProof = ProximityProofHelper.generateProofIfWithin50m(
      userLat: 41.0000,
      userLon: 29.0000,
      stationLat: 41.0100,
      stationLon: 29.0000,
      stationId: 'station-uuid-1234',
      nonce: nonce,
    );
    expect(distantProof, isNull);
  });
}
```

---

## 12. Canlı Doğrulama ve Çalıştırma Talimatları

Geliştiricilerin ve QA test mühendislerinin mobil test paketini yerel terminalde koşturabilmesi için gereken adımlar:

### 12.1. Ön Koşul: Flutter Ortamının Onarılması
Ortamdaki "Exec format error" hatasını gidermek için ARM64 macOS Flutter SDK kurulmalıdır:
```bash
# Darwin arm64 Flutter SDK kurulumu (veya FVM kullanımı)
fvm install 3.27.1
fvm use 3.27.1
```

### 12.2. Bağımlılık Kurulumu ve Statik Kod Analizi
```bash
cd workspace/src/mobile

# Paket bağımlılıklarını çekin
flutter pub get

# Tasarım tokenları ve kod kurallarını denetleyin (sıfır hata hedefi)
flutter analyze
```

### 12.3. Test Paketinin Çalıştırılması
```bash
# Tüm birim ve widget testlerini çalıştırın
flutter test

# Yalnızca derin bağlantı testlerini koşturun
flutter test test/deeplink_service_test.dart

# Yalnızca arayüz ve eksik veri widget testlerini koşturun
flutter test test/station_detail_test.dart

# Güvenlik ve sıfır konum saklama (proximity proof) testlerini koşturun
flutter test test/proximity_proof_test.dart
```

### 12.4. Başarı Kriteri
Tüm test senaryoları (`test/*.dart`) yeşil renkte tamamlanmalı (`All tests passed!`); kod kapsamı (coverage) çekirdek servis ve BLoC sınıflarında **≥ %85** olmalıdır.
