
// TALEP-045: Harita aramasında ilçe sonuçlarının tam kapsamı.
// Backend `modules/gadm/gadm.data.ts` ile birebir aynı il → ilçe sözlüğü
// (81 il, 973 ilçe) burada istemci tarafına taşınır; GADM API erişilemediğinde
// dahi Esenler, Bağcılar, Eyüpsultan gibi örneklem dışı ilçeler arama
// sonuçlarında listelenir. Koordinat stratejisi backend ile aynıdır:
// bilinen büyük ilçeler gerçek merkez koordinatı taşır, diğerleri il
// merkezi etrafında deterministik olarak türetilir (API canlıysa uzak
// sonuçlar her zaman önceliklidir ve bu yerel tahminleri ezer).

export interface TurkeyCity {
  name: string;
  slug: string;
  lat: number;
  lon: number;
}

export interface TurkeyDistrict {
  name: string;
  slug: string;
  parentName: string;
  provinceSlug: string;
  lat: number;
  lon: number;
}

// Türkçe harf katlama — backend utils/unicode ile aynı kurallar
const geoFold = (s: string): string =>
  (s || '')
    .toLocaleLowerCase('tr')
    .normalize('NFC')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

const geoSlug = (s: string): string =>
  geoFold(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const TURKEY_81_CITIES: TurkeyCity[] = [
  { name: 'Adana', slug: 'adana', lat: 36.9914, lon: 35.3308 },
  { name: 'Adıyaman', slug: 'adiyaman', lat: 37.7648, lon: 38.2786 },
  { name: 'Afyonkarahisar', slug: 'afyonkarahisar', lat: 38.7569, lon: 30.5401 },
  { name: 'Ağrı', slug: 'agri', lat: 39.7217, lon: 43.0519 },
  { name: 'Aksaray', slug: 'aksaray', lat: 38.3687, lon: 34.0254 },
  { name: 'Amasya', slug: 'amasya', lat: 40.6534, lon: 35.8353 },
  { name: 'Ankara', slug: 'ankara', lat: 39.9334, lon: 32.8597 },
  { name: 'Antalya', slug: 'antalya', lat: 36.8969, lon: 30.7133 },
  { name: 'Ardahan', slug: 'ardahan', lat: 41.1105, lon: 42.7022 },
  { name: 'Artvin', slug: 'artvin', lat: 41.1828, lon: 41.8183 },
  { name: 'Aydın', slug: 'aydin', lat: 37.8560, lon: 27.8458 },
  { name: 'Balıkesir', slug: 'balikesir', lat: 39.6484, lon: 27.8826 },
  { name: 'Bartın', slug: 'bartin', lat: 41.6358, lon: 32.3375 },
  { name: 'Batman', slug: 'batman', lat: 37.8812, lon: 41.1294 },
  { name: 'Bayburt', slug: 'bayburt', lat: 40.2552, lon: 40.2249 },
  { name: 'Bilecik', slug: 'bilecik', lat: 40.1426, lon: 29.9793 },
  { name: 'Bingöl', slug: 'bingol', lat: 38.8855, lon: 40.4939 },
  { name: 'Bitlis', slug: 'bitlis', lat: 38.4006, lon: 42.1095 },
  { name: 'Bolu', slug: 'bolu', lat: 40.7350, lon: 31.6061 },
  { name: 'Burdur', slug: 'burdur', lat: 37.7203, lon: 30.2889 },
  { name: 'Bursa', slug: 'bursa', lat: 40.1885, lon: 29.0610 },
  { name: 'Çanakkale', slug: 'canakkale', lat: 40.1553, lon: 26.4086 },
  { name: 'Çankırı', slug: 'cankiri', lat: 40.6013, lon: 33.6134 },
  { name: 'Çorum', slug: 'corum', lat: 40.5506, lon: 34.9556 },
  { name: 'Denizli', slug: 'denizli', lat: 37.7765, lon: 29.0864 },
  { name: 'Diyarbakır', slug: 'diyarbakir', lat: 37.9144, lon: 40.2110 },
  { name: 'Düzce', slug: 'duzce', lat: 40.8438, lon: 31.1565 },
  { name: 'Edirne', slug: 'edirne', lat: 41.6771, lon: 26.5557 },
  { name: 'Elazığ', slug: 'elazig', lat: 38.6810, lon: 39.2264 },
  { name: 'Erzincan', slug: 'erzincan', lat: 39.7500, lon: 39.4911 },
  { name: 'Erzurum', slug: 'erzurum', lat: 39.9043, lon: 41.2769 },
  { name: 'Eskişehir', slug: 'eskisehir', lat: 39.7767, lon: 30.5256 },
  { name: 'Gaziantep', slug: 'gaziantep', lat: 37.0662, lon: 37.3822 },
  { name: 'Giresun', slug: 'giresun', lat: 40.9128, lon: 38.3895 },
  { name: 'Gümüşhane', slug: 'gumushane', lat: 40.4600, lon: 39.4718 },
  { name: 'Hakkari', slug: 'hakkari', lat: 37.5833, lon: 43.7408 },
  { name: 'Hatay', slug: 'hatay', lat: 36.2023, lon: 36.1667 },
  { name: 'Iğdır', slug: 'igdir', lat: 39.9237, lon: 44.0450 },
  { name: 'Isparta', slug: 'isparta', lat: 37.7648, lon: 30.5537 },
  { name: 'İstanbul', slug: 'istanbul', lat: 41.0082, lon: 28.9784 },
  { name: 'İzmir', slug: 'izmir', lat: 38.4237, lon: 27.1428 },
  { name: 'Kahramanmaraş', slug: 'kahramanmaras', lat: 37.5858, lon: 36.9371 },
  { name: 'Karabük', slug: 'karabuk', lat: 41.2061, lon: 32.6277 },
  { name: 'Karaman', slug: 'karaman', lat: 37.1759, lon: 33.2150 },
  { name: 'Kars', slug: 'kars', lat: 40.6013, lon: 43.0975 },
  { name: 'Kastamonu', slug: 'kastamonu', lat: 41.3887, lon: 33.7765 },
  { name: 'Kayseri', slug: 'kayseri', lat: 38.7312, lon: 35.4853 },
  { name: 'Kilis', slug: 'kilis', lat: 36.7184, lon: 37.1150 },
  { name: 'Kırıkkale', slug: 'kirikkale', lat: 39.8468, lon: 33.5064 },
  { name: 'Kırklareli', slug: 'kirklareli', lat: 41.7333, lon: 27.2244 },
  { name: 'Kırşehir', slug: 'kirsehir', lat: 39.1425, lon: 34.1709 },
  { name: 'Kocaeli', slug: 'kocaeli', lat: 40.7654, lon: 29.9400 },
  { name: 'Konya', slug: 'konya', lat: 37.8746, lon: 32.4846 },
  { name: 'Kütahya', slug: 'kutahya', lat: 39.4167, lon: 29.9833 },
  { name: 'Malatya', slug: 'malatya', lat: 38.3552, lon: 38.3552 },
  { name: 'Manisa', slug: 'manisa', lat: 38.6191, lon: 27.4260 },
  { name: 'Mardin', slug: 'mardin', lat: 37.3212, lon: 40.7420 },
  { name: 'Mersin', slug: 'mersin', lat: 36.8121, lon: 34.6415 },
  { name: 'Muğla', slug: 'mugla', lat: 37.2153, lon: 28.3636 },
  { name: 'Muş', slug: 'mus', lat: 38.7432, lon: 41.5064 },
  { name: 'Nevşehir', slug: 'nevsehir', lat: 38.6244, lon: 34.7144 },
  { name: 'Niğde', slug: 'nigde', lat: 37.9667, lon: 34.6857 },
  { name: 'Ordu', slug: 'ordu', lat: 40.9839, lon: 37.8797 },
  { name: 'Osmaniye', slug: 'osmaniye', lat: 37.0742, lon: 36.2464 },
  { name: 'Rize', slug: 'rize', lat: 41.0201, lon: 40.5217 },
  { name: 'Sakarya', slug: 'sakarya', lat: 40.7569, lon: 30.4033 },
  { name: 'Samsun', slug: 'samsun', lat: 41.2867, lon: 36.3360 },
  { name: 'Şanlıurfa', slug: 'sanliurfa', lat: 37.1674, lon: 38.7955 },
  { name: 'Siirt', slug: 'siirt', lat: 37.9333, lon: 41.9420 },
  { name: 'Sinop', slug: 'sinop', lat: 42.0231, lon: 35.1517 },
  { name: 'Sivas', slug: 'sivas', lat: 39.7477, lon: 37.0145 },
  { name: 'Şırnak', slug: 'sirnak', lat: 37.5164, lon: 42.4594 },
  { name: 'Tekirdağ', slug: 'tekirdag', lat: 40.9839, lon: 27.5110 },
  { name: 'Tokat', slug: 'tokat', lat: 40.3167, lon: 36.5544 },
  { name: 'Trabzon', slug: 'trabzon', lat: 41.0027, lon: 39.7168 },
  { name: 'Tunceli', slug: 'tunceli', lat: 39.1079, lon: 39.5401 },
  { name: 'Uşak', slug: 'usak', lat: 38.6823, lon: 29.4058 },
  { name: 'Van', slug: 'van', lat: 38.4891, lon: 43.3748 },
  { name: 'Yalova', slug: 'yalova', lat: 40.6500, lon: 29.2769 },
  { name: 'Yozgat', slug: 'yozgat', lat: 39.8181, lon: 34.8044 },
  { name: 'Zonguldak', slug: 'zonguldak', lat: 41.4564, lon: 31.7987 },
];

// Bilinen büyük ilçelerin gerçek merkez koordinatları (`ilSlug-ilceSlug`).
const DISTRICT_COORD_OVERRIDES: Record<string, { lat: number; lon: number }> = {
  'istanbul-kadikoy': { lat: 40.991, lon: 29.025 },
  'istanbul-besiktas': { lat: 41.042, lon: 29.008 },
  'istanbul-sisli': { lat: 41.06, lon: 28.987 },
  'istanbul-uskudar': { lat: 41.026, lon: 29.015 },
  'istanbul-atasehir': { lat: 40.983, lon: 29.117 },
  'istanbul-bakirkoy': { lat: 40.978, lon: 28.872 },
  'istanbul-beylikduzu': { lat: 41.001, lon: 28.647 },
  'istanbul-sariyer': { lat: 41.166, lon: 29.05 },
  'istanbul-maltepe': { lat: 40.933, lon: 29.15 },
  'istanbul-kartal': { lat: 40.89, lon: 29.185 },
  'istanbul-pendik': { lat: 40.875, lon: 29.233 },
  'istanbul-basaksehir': { lat: 41.096, lon: 28.803 },
  'istanbul-umraniye': { lat: 41.025, lon: 29.116 },
  'istanbul-fatih': { lat: 41.018, lon: 28.949 },
  'istanbul-esenler': { lat: 41.034, lon: 28.89 },
  'ankara-cankaya': { lat: 39.9, lon: 32.86 },
  'ankara-yenimahalle': { lat: 39.967, lon: 32.817 },
  'ankara-etimesgut': { lat: 39.949, lon: 32.665 },
  'ankara-kecioren': { lat: 40.003, lon: 32.864 },
  'ankara-golbasi': { lat: 39.79, lon: 32.808 },
  'ankara-mamak': { lat: 39.94, lon: 32.915 },
  'izmir-konak': { lat: 38.419, lon: 27.128 },
  'izmir-karsiyaka': { lat: 38.459, lon: 27.11 },
  'izmir-bornova': { lat: 38.468, lon: 27.218 },
  'izmir-cesme': { lat: 38.323, lon: 26.304 },
  'izmir-urla': { lat: 38.322, lon: 26.764 },
  'izmir-bayrakli': { lat: 38.462, lon: 27.165 },
  'antalya-muratpasa': { lat: 36.885, lon: 30.707 },
  'antalya-konyaalti': { lat: 36.862, lon: 30.636 },
  'antalya-alanya': { lat: 36.544, lon: 31.995 },
  'mugla-bodrum': { lat: 37.038, lon: 27.429 },
  'mugla-fethiye': { lat: 36.621, lon: 29.116 },
  'mugla-marmaris': { lat: 36.855, lon: 28.274 },
  'bursa-nilufer': { lat: 40.214, lon: 28.983 },
  'bursa-osmangazi': { lat: 40.203, lon: 29.06 },
  'kocaeli-izmit': { lat: 40.765, lon: 29.94 },
  'kocaeli-gebze': { lat: 40.802, lon: 29.43 },
};

// İl slug → resmi ilçe adları (backend gadm.data.ts ile birebir aynı kaynak).
const PROVINCE_DISTRICT_NAMES: Record<string, string[]> = {
  adana: ['Aladağ', 'Ceyhan', 'Çukurova', 'Feke', 'İmamoğlu', 'Karaisalı', 'Karataş', 'Kozan', 'Pozantı', 'Saimbeyli', 'Sarıçam', 'Seyhan', 'Tufanbeyli', 'Yumurtalık', 'Yüreğir'],
  adiyaman: ['Besni', 'Çelikhan', 'Gerger', 'Gölbaşı', 'Kahta', 'Merkez', 'Samsat', 'Sincik', 'Tut'],
  afyonkarahisar: ['Başmakçı', 'Bayat', 'Bolvadin', 'Çay', 'Çobanlar', 'Dazkırı', 'Dinar', 'Emirdağ', 'Evciler', 'Hocalar', 'İhsaniye', 'İscehisar', 'Kızılören', 'Merkez', 'Sandıklı', 'Sinanpaşa', 'Sultandağı', 'Şuhut'],
  agri: ['Diyadin', 'Doğubayazıt', 'Eleşkirt', 'Hamur', 'Merkez', 'Patnos', 'Taşlıçay', 'Tutak'],
  amasya: ['Göynücek', 'Gümüşhacıköy', 'Hamamözü', 'Merkez', 'Merzifon', 'Suluova', 'Taşova'],
  ankara: ['Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kahramankazan', 'Kalecik', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle'],
  antalya: ['Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı', 'Elmalı', 'Finike', 'Gazipaşa', 'Gündoğmuş', 'İbradı', 'Kaş', 'Kemer', 'Kepez', 'Konyaaltı', 'Korkuteli', 'Kumluca', 'Manavgat', 'Muratpaşa', 'Serik'],
  artvin: ['Ardanuç', 'Arhavi', 'Borçka', 'Hopa', 'Kemalpaşa', 'Merkez', 'Murgul', 'Şavşat', 'Yusufeli'],
  aydin: ['Bozdoğan', 'Buharkent', 'Çine', 'Didim', 'Efeler', 'Germencik', 'İncirliova', 'Karacasu', 'Karpuzlu', 'Koçarlı', 'Köşk', 'Kuşadası', 'Kuyucak', 'Nazilli', 'Söke', 'Sultanhisar', 'Yenipazar'],
  balikesir: ['Altıeylül', 'Ayvalık', 'Balya', 'Bandırma', 'Bigadiç', 'Burhaniye', 'Dursunbey', 'Edremit', 'Erdek', 'Gömeç', 'Gönen', 'Havran', 'İvrindi', 'Karesi', 'Kepsut', 'Manyas', 'Marmara', 'Savaştepe', 'Sındırgı', 'Susurluk'],
  bilecik: ['Bozüyük', 'Gölpazarı', 'İnhisar', 'Merkez', 'Osmaneli', 'Pazaryeri', 'Söğüt', 'Yenipazar'],
  bingol: ['Adaklı', 'Genç', 'Karlıova', 'Kiğı', 'Merkez', 'Solhan', 'Yayladere', 'Yedisu'],
  bitlis: ['Adilcevaz', 'Ahlat', 'Güroymak', 'Hizan', 'Merkez', 'Mutki', 'Tatvan'],
  bolu: ['Dörtdivan', 'Gerede', 'Göynük', 'Kıbrıscık', 'Mengen', 'Merkez', 'Mudurnu', 'Seben', 'Yeniçağa'],
  burdur: ['Ağlasun', 'Altınyayla', 'Bucak', 'Çavdır', 'Çeltikçi', 'Gölhisar', 'Karamanlı', 'Kemer', 'Merkez', 'Tefenni', 'Yeşilova'],
  bursa: ['Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik', 'Karacabey', 'Keles', 'Kestel', 'Mudanya', 'Mustafakemalpaşa', 'Nilüfer', 'Orhaneli', 'Orhangazi', 'Osmangazi', 'Yenişehir', 'Yıldırım'],
  canakkale: ['Ayvacık', 'Bayramiç', 'Biga', 'Bozcaada', 'Çan', 'Eceabat', 'Ezine', 'Gelibolu', 'Gökçeada', 'Lapseki', 'Merkez', 'Yenice'],
  cankiri: ['Atkaracalar', 'Bayramören', 'Çerkeş', 'Eldivan', 'Ilgaz', 'Kızılırmak', 'Korgun', 'Kurşunlu', 'Merkez', 'Orta', 'Şabanözü', 'Yapraklı'],
  corum: ['Alaca', 'Bayat', 'Boğazkale', 'Dodurga', 'İskilip', 'Kargı', 'Laçin', 'Mecitözü', 'Merkez', 'Oğuzlar', 'Ortaköy', 'Osmancık', 'Sungurlu', 'Uğurludağ'],
  denizli: ['Acıpayam', 'Babadağ', 'Baklan', 'Bekilli', 'Beyağaç', 'Bozkurt', 'Buldan', 'Çal', 'Çameli', 'Çardak', 'Çivril', 'Güney', 'Honaz', 'Kale', 'Merkezefendi', 'Pamukkale', 'Sarayköy', 'Serinhisar', 'Tavas'],
  diyarbakir: ['Bağlar', 'Bismil', 'Çermik', 'Çınar', 'Çüngüş', 'Dicle', 'Eğil', 'Ergani', 'Hani', 'Hazro', 'Kayapınar', 'Kocaköy', 'Kulp', 'Lice', 'Silvan', 'Sur', 'Yenişehir'],
  edirne: ['Enez', 'Havsa', 'İpsala', 'Keşan', 'Lalapaşa', 'Meriç', 'Merkez', 'Süloğlu', 'Uzunköprü'],
  elazig: ['Ağın', 'Alacakaya', 'Arıcak', 'Baskil', 'Karakoçan', 'Keban', 'Kovancılar', 'Maden', 'Merkez', 'Palu', 'Sivrice'],
  erzincan: ['Çayırlı', 'İliç', 'Kemah', 'Kemaliye', 'Merkez', 'Otlukbeli', 'Refahiye', 'Tercan', 'Üzümlü'],
  erzurum: ['Aşkale', 'Aziziye', 'Çat', 'Hınıs', 'Horasan', 'İspir', 'Karaçoban', 'Karayazı', 'Köprüköy', 'Narman', 'Oltu', 'Olur', 'Palandöken', 'Pasinler', 'Pazaryolu', 'Şenkaya', 'Tekman', 'Tortum', 'Uzundere', 'Yakutiye'],
  eskisehir: ['Alpu', 'Beylikova', 'Çifteler', 'Günyüzü', 'Han', 'İnönü', 'Mahmudiye', 'Mihalgazi', 'Mihalıççık', 'Odunpazarı', 'Sarıcakaya', 'Seyitgazi', 'Sivrihisar', 'Tepebaşı'],
  gaziantep: ['Araban', 'İslahiye', 'Karkamış', 'Nizip', 'Nurdağı', 'Oğuzeli', 'Şahinbey', 'Şehitkamil', 'Yavuzeli'],
  giresun: ['Alucra', 'Bulancak', 'Çamoluk', 'Çanakçı', 'Dereli', 'Doğankent', 'Espiye', 'Eynesil', 'Görele', 'Güce', 'Keşap', 'Merkez', 'Piraziz', 'Şebinkarahisar', 'Tirebolu', 'Yağlıdere'],
  gumushane: ['Kelkit', 'Köse', 'Kürtün', 'Merkez', 'Şiran', 'Torul'],
  hakkari: ['Çukurca', 'Derecik', 'Merkez', 'Şemdinli', 'Yüksekova'],
  hatay: ['Altınözü', 'Antakya', 'Arsuz', 'Belen', 'Defne', 'Dörtyol', 'Erzin', 'Hassa', 'İskenderun', 'Kırıkhan', 'Kumlu', 'Payas', 'Reyhanlı', 'Samandağ', 'Yayladağı'],
  isparta: ['Aksu', 'Atabey', 'Eğirdir', 'Gelendost', 'Gönen', 'Keçiborlu', 'Merkez', 'Senirkent', 'Sütçüler', 'Şarkikaraağaç', 'Uluborlu', 'Yalvaç', 'Yenişarbademli'],
  mersin: ['Akdeniz', 'Anamur', 'Aydıncık', 'Bozyazı', 'Çamlıyayla', 'Erdemli', 'Gülnar', 'Mezitli', 'Mut', 'Silifke', 'Tarsus', 'Toroslar', 'Yenişehir'],
  istanbul: ['Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'],
  izmir: ['Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla'],
  kars: ['Akyaka', 'Arpaçay', 'Digor', 'Kağızman', 'Merkez', 'Sarıkamış', 'Selim', 'Susuz'],
  kastamonu: ['Abana', 'Ağlı', 'Araç', 'Azdavay', 'Bozkurt', 'Cide', 'Çatalzeytin', 'Daday', 'Devrekani', 'Doğanyurt', 'Hanönü', 'İhsangazi', 'İnebolu', 'Küre', 'Merkez', 'Pınarbaşı', 'Seydiler', 'Şenpazar', 'Taşköprü', 'Tosya'],
  kayseri: ['Akkışla', 'Bünyan', 'Develi', 'Felahiye', 'Hacılar', 'İncesu', 'Kocasinan', 'Melikgazi', 'Özvatan', 'Pınarbaşı', 'Sarıoğlan', 'Sarız', 'Talas', 'Tomarza', 'Yahyalı', 'Yeşilhisar'],
  kirklareli: ['Babaeski', 'Demirköy', 'Kofçaz', 'Lüleburgaz', 'Merkez', 'Pehlivanköy', 'Pınarhisar', 'Vize'],
  kirsehir: ['Akçakent', 'Akpınar', 'Boztepe', 'Çiçekdağı', 'Kaman', 'Merkez', 'Mucur'],
  kocaeli: ['Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze', 'Gölcük', 'İzmit', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez'],
  konya: ['Ahırlı', 'Akören', 'Akşehir', 'Altınekin', 'Beyşehir', 'Bozkır', 'Cihanbeyli', 'Çeltik', 'Çumra', 'Derbent', 'Derebucak', 'Doğanhisar', 'Emirgazi', 'Ereğli', 'Güneysınır', 'Hadim', 'Halkapınar', 'Hüyük', 'Ilgın', 'Kadınhanı', 'Karapınar', 'Karatay', 'Kulu', 'Meram', 'Sarayönü', 'Selçuklu', 'Seydişehir', 'Taşkent', 'Tuzlukçu', 'Yalıhüyük', 'Yunak'],
  kutahya: ['Altıntaş', 'Aslanapa', 'Çavdarhisar', 'Domaniç', 'Dumlupınar', 'Emet', 'Gediz', 'Hisarcık', 'Merkez', 'Pazarlar', 'Simav', 'Şaphane', 'Tavşanlı'],
  malatya: ['Akçadağ', 'Arapgir', 'Arguvan', 'Battalgazi', 'Darende', 'Doğanşehir', 'Doğanyol', 'Hekimhan', 'Kale', 'Kuluncak', 'Pütürge', 'Yazıhan', 'Yeşilyurt'],
  manisa: ['Ahmetli', 'Akhisar', 'Alaşehir', 'Demirci', 'Gölmarmara', 'Gördes', 'Kırkağaç', 'Köprübaşı', 'Kula', 'Salihli', 'Sarıgöl', 'Saruhanlı', 'Selendi', 'Soma', 'Şehzadeler', 'Turgutlu', 'Yunusemre'],
  kahramanmaras: ['Afşin', 'Andırın', 'Çağlayancerit', 'Dulkadiroğlu', 'Ekinözü', 'Elbistan', 'Göksun', 'Nurhak', 'Onikişubat', 'Pazarcık', 'Türkoğlu'],
  mardin: ['Artuklu', 'Dargeçit', 'Derik', 'Kızıltepe', 'Mazıdağı', 'Midyat', 'Nusaybin', 'Ömerli', 'Savur', 'Yeşilli'],
  mugla: ['Bodrum', 'Dalaman', 'Datça', 'Fethiye', 'Kavaklıdere', 'Köyceğiz', 'Marmaris', 'Menteşe', 'Milas', 'Ortaca', 'Seydikemer', 'Ula', 'Yatağan'],
  mus: ['Bulanık', 'Hasköy', 'Korkut', 'Malazgirt', 'Merkez', 'Varto'],
  nevsehir: ['Acıgöl', 'Avanos', 'Derinkuyu', 'Gülşehir', 'Hacıbektaş', 'Kozaklı', 'Merkez', 'Ürgüp'],
  nigde: ['Altunhisar', 'Bor', 'Çamardı', 'Çiftlik', 'Merkez', 'Ulukışla'],
  ordu: ['Akkuş', 'Altınordu', 'Aybastı', 'Çamaş', 'Çatalpınar', 'Çaybaşı', 'Fatsa', 'Gölköy', 'Gülyalı', 'Gürgentepe', 'İkizce', 'Kabadüz', 'Kabataş', 'Korgan', 'Kumru', 'Mesudiye', 'Perşembe', 'Ulubey', 'Ünye'],
  rize: ['Ardeşen', 'Çamlıhemşin', 'Çayeli', 'Derepazarı', 'Fındıklı', 'Güneysu', 'Hemşin', 'İkizdere', 'İyidere', 'Kalkandere', 'Merkez', 'Pazar'],
  sakarya: ['Adapazarı', 'Akyazı', 'Arifiye', 'Erenler', 'Ferizli', 'Geyve', 'Hendek', 'Karapürçek', 'Karasu', 'Kaynarca', 'Kocaali', 'Pamukova', 'Sapanca', 'Serdivan', 'Söğütlü', 'Taraklı'],
  samsun: ['19 Mayıs', 'Alaçam', 'Asarcık', 'Atakum', 'Ayvacık', 'Bafra', 'Canik', 'Çarşamba', 'Havza', 'İlkadım', 'Kavak', 'Ladik', 'Salıpazarı', 'Tekkeköy', 'Terme', 'Vezirköprü', 'Yakakent'],
  siirt: ['Baykan', 'Eruh', 'Kurtalan', 'Merkez', 'Pervari', 'Şirvan', 'Tillo'],
  sinop: ['Ayancık', 'Boyabat', 'Dikmen', 'Durağan', 'Erfelek', 'Gerze', 'Merkez', 'Saraydüzü', 'Türkeli'],
  sivas: ['Akıncılar', 'Altınyayla', 'Divriği', 'Doğanşar', 'Gemerek', 'Gölova', 'Gürün', 'Hafik', 'İmranlı', 'Kangal', 'Koyulhisar', 'Merkez', 'Suşehri', 'Şarkışla', 'Ulaş', 'Yıldızeli', 'Zara'],
  tekirdag: ['Çerkezköy', 'Çorlu', 'Ergene', 'Hayrabolu', 'Kapaklı', 'Malkara', 'Marmaraereğlisi', 'Muratlı', 'Saray', 'Süleymanpaşa', 'Şarköy'],
  tokat: ['Almus', 'Artova', 'Başçiftlik', 'Erbaa', 'Merkez', 'Niksar', 'Pazar', 'Reşadiye', 'Sulusaray', 'Turhal', 'Yeşilyurt', 'Zile'],
  trabzon: ['Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 'Çarşıbaşı', 'Çaykara', 'Dernekpazarı', 'Düzköy', 'Hayrat', 'Köprübaşı', 'Maçka', 'Of', 'Ortahisar', 'Sürmene', 'Şalpazarı', 'Tonya', 'Vakfıkebir', 'Yomra'],
  tunceli: ['Çemişgezek', 'Hozat', 'Mazgirt', 'Merkez', 'Nazımiye', 'Ovacık', 'Pertek', 'Pülümür'],
  sanliurfa: ['Akçakale', 'Birecik', 'Bozova', 'Ceylanpınar', 'Eyyübiye', 'Halfeti', 'Haliliye', 'Harran', 'Hilvan', 'Karaköprü', 'Siverek', 'Suruç', 'Viranşehir'],
  usak: ['Banaz', 'Eşme', 'Karahallı', 'Merkez', 'Sivaslı', 'Ulubey'],
  van: ['Bahçesaray', 'Başkale', 'Çaldıran', 'Çatak', 'Edremit', 'Erciş', 'Gevaş', 'Gürpınar', 'İpekyolu', 'Muradiye', 'Özalp', 'Saray', 'Tuşba'],
  yozgat: ['Akdağmadeni', 'Aydıncık', 'Boğazlıyan', 'Çandır', 'Çayıralan', 'Çekerek', 'Kadışehri', 'Merkez', 'Saraykent', 'Sarıkaya', 'Sorgun', 'Şefaatli', 'Yenifakılı', 'Yerköy'],
  zonguldak: ['Alaplı', 'Çaycuma', 'Devrek', 'Gökçebey', 'Karadeniz Ereğli', 'Kilimli', 'Kozlu', 'Merkez'],
  aksaray: ['Ağaçören', 'Eskil', 'Gülağaç', 'Güzelyurt', 'Merkez', 'Ortaköy', 'Sarıyahşi', 'Sultanhanı'],
  bayburt: ['Aydıntepe', 'Demirözü', 'Merkez'],
  karaman: ['Ayrancı', 'Başyayla', 'Ermenek', 'Kazımkarabekir', 'Merkez', 'Sarıveliler'],
  kirikkale: ['Bahşılı', 'Balışeyh', 'Çelebi', 'Delice', 'Karakeçili', 'Keskin', 'Merkez', 'Sulakyurt', 'Yahşihan'],
  batman: ['Beşiri', 'Gercüş', 'Hasankeyf', 'Kozluk', 'Merkez', 'Sason'],
  sirnak: ['Beytüşşebap', 'Cizre', 'Güçlükonak', 'İdil', 'Merkez', 'Silopi', 'Uludere'],
  bartin: ['Amasra', 'Kurucaşile', 'Merkez', 'Ulus'],
  ardahan: ['Çıldır', 'Damal', 'Göle', 'Hanak', 'Merkez', 'Posof'],
  igdir: ['Aralık', 'Karakoyunlu', 'Merkez', 'Tuzluca'],
  yalova: ['Altınova', 'Armutlu', 'Çınarcık', 'Çiftlikköy', 'Merkez', 'Termal'],
  karabuk: ['Eflani', 'Eskipazar', 'Merkez', 'Ovacık', 'Safranbolu', 'Yenice'],
  kilis: ['Elbeyli', 'Merkez', 'Musabeyli', 'Polateli'],
  osmaniye: ['Bahçe', 'Düziçi', 'Hasanbeyli', 'Kadirli', 'Merkez', 'Sumbas', 'Toprakkale'],
  duzce: ['Akçakoca', 'Cumayeri', 'Çilimli', 'Gölyaka', 'Gümüşova', 'Kaynaşlı', 'Merkez', 'Yığılca'],
};

const cityBySlug = new Map<string, TurkeyCity>(TURKEY_81_CITIES.map((c) => [c.slug, c]));

const round4 = (n: number) => Math.round(n * 10000) / 10000;

// İlçe dizini: gerçek koordinat bilinenler override'tan gelir; diğerleri il
// merkezi etrafında backend gadm.data.ts ile aynı deterministik dağılımla
// türetilir (API erişilebilirse uzak sonuçlar birleştirmede zaten öncelikli).
export const TURKEY_ALL_DISTRICTS: TurkeyDistrict[] = (() => {
  const list: TurkeyDistrict[] = [];
  for (const province of TURKEY_81_CITIES) {
    const names = PROVINCE_DISTRICT_NAMES[province.slug] || ['Merkez'];
    names.forEach((name, idx) => {
      const slug = geoSlug(name);
      const key = `${province.slug}-${slug}`;
      const known = DISTRICT_COORD_OVERRIDES[key];
      let lat: number;
      let lon: number;
      if (known) {
        lat = known.lat;
        lon = known.lon;
      } else {
        const angle = (idx / names.length) * 6.28318;
        const radius = 0.08 + (idx % 3) * 0.06;
        lat = round4(province.lat + Math.sin(angle) * radius);
        lon = round4(province.lon + Math.cos(angle) * radius);
      }
      list.push({ name, slug, parentName: province.name, provinceSlug: province.slug, lat, lon });
    });
  }
  return list;
})();

export const foldGeoText = geoFold;
export { cityBySlug };
