
class AppConstants {
  AppConstants._();

  static const String appName = 'elektriklioto.com';
  static const String appVersion = 'v1.0.0';

  static const String apiBaseUrl = 'https://api.elektriklioto.com/api/v1';

  static const int bboxDebounceMs = 300;
  static const int searchDebounceMs = 250;

  static const double turkeyMinLat = 35.8;
  static const double turkeyMaxLat = 42.2;
  static const double turkeyMinLon = 25.6;
  static const double turkeyMaxLon = 44.9;

  static const double initialLat = 39.92077;
  static const double initialLon = 32.85411;
  static const double initialZoom = 6.5;

  static const double defaultClusterMaxZoom = 12.0;

  static const String legalEmpDisclaimer =
      'elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.';

  static const String epdkDataSourceNotice =
      'İstasyon verileri EPDK Şarj Hizmeti Yönetmeliği kapsamındaki sicil kayıtlarıyla tohumlanmıştır.';

  static const String lockedFilterNotice =
      'Operatör Verisi Bekleniyor — Bu filtre yakında aktifleşecektir.';
}
