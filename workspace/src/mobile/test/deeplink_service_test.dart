
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

  test('DeepLinkService triggers clipboard fallback when deep_link_url is empty', () async {
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

  test('DeepLinkService launches deepLinkUrl when present', () async {
    const testStationWithLink = StationDetail(
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
        deepLinkUrl: 'zes://station/1904',
        clipboardFallback: false,
      ),
    );

    String? copiedText;
    String? toastMessage;
    Uri? launchedUri;

    await DeepLinkService.launchOperator(
      station: testStationWithLink,
      onShowToast: (msg) => toastMessage = msg,
      onCopyToClipboard: (txt) => copiedText = txt,
      urlLauncher: (uri, {mode = LaunchMode.platformDefault}) async {
        launchedUri = uri;
        return true;
      },
    );

    expect(launchedUri, Uri.parse('zes://station/1904'));
    expect(copiedText, isNull);
    expect(toastMessage, isNull);
  });
}
