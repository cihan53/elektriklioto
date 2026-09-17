
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/station_detail.dart';

/// Operatör derin bağlantı (Deep-Link) ve Clipboard Fallback Motoru
/// PO-401 & SCR-02 spesifikasyonlarını uygular.
class DeepLinkService {
  DeepLinkService._();

  static Future<void> launchOperator({
    required StationDetail station,
    required Function(String) onShowToast,
    Function(String)? onCopyToClipboard,
    Future<bool> Function(Uri, {LaunchMode mode})? urlLauncher,
  }) async {
    final launcher = urlLauncher ?? launchUrl;
    final deepLink = station.deepLink;
    final copyCode = deepLink.clipboardText ?? station.istasyonNo;

    // 1. CPO Native URL Şeması denemesi
    if (deepLink.deepLinkUrl != null && deepLink.deepLinkUrl!.isNotEmpty) {
      final uri = Uri.parse(deepLink.deepLinkUrl!);
      try {
        final launched = await launcher(uri, mode: LaunchMode.externalApplication);
        if (launched) return;
      } catch (_) {}
    }

    // 2. Desteklenmeyen şemalarda Pano (Clipboard) Fallback
    if (onCopyToClipboard != null) {
      onCopyToClipboard(copyCode);
    } else {
      await Clipboard.setData(ClipboardData(text: copyCode));
    }

    // 3. Kullanıcıya 4000ms yönerge bildirimi (Toast)
    onShowToast(
      'İstasyon kodu ($copyCode) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz.',
    );

    // 4. Mağaza bağlantısı veya operatör web sayfasına yönlendirme
    final fallbackWeb = deepLink.storeUrl ??
        station.operator.websiteUrl ??
        'https://elektriklioto.com/${station.operator.slug}';
    final fallbackUri = Uri.parse(fallbackWeb);
    try {
      await launcher(fallbackUri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }
}
