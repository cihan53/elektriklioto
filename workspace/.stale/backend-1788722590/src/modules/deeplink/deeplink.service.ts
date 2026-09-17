
import { DeepLinkResolution, DeepLinkConfigTemplate } from './deeplink.types.js';

/**
 * Güvenli Derin Bağlantı (Deep-Link) Motoru ve Pano (Clipboard) Fallback Yöneticisi
 * 
 * Güvenlik Politikası:
 * 1. Yalnızca izinli URL şemaları kabul edilir (Open Redirect koruması).
 * 2. javascript:, data:, vb. kötü niyetli protokoller kesinlikle engellenir.
 * 3. Operatörün desteklemediği durumlarda istasyon kodu panoya aktarılır (clipboard_fallback: true).
 */
export class DeepLinkService {
  // İzin verilen güvenli protokol şemaları
  private static readonly ALLOWED_SCHEMES = [
    'zes://',
    'trugo://',
    'esarj://',
    'voltrun://',
    'sharz://',
    'astor://',
    'gioev://',
    'beefull://',
    'https://',
  ];

  /**
   * Verilen URL'nin güvenli ve izinli protokollerden biri olduğunu doğrular.
   */
  public static isSafeUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    const trimmed = url.trim();

    // Tehlikeli protokol engeli
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const proto of dangerousProtocols) {
      if (trimmed.toLowerCase().startsWith(proto)) {
        return false;
      }
    }

    // Beyaz liste kontrolü
    return this.ALLOWED_SCHEMES.some((scheme) => trimmed.toLowerCase().startsWith(scheme));
  }

  /**
   * Şablon içindeki değişkenleri ({station_code}, {slug}) güvenle yerleştirir.
   */
  public static interpolateTemplate(template: string | null | undefined, context: { stationCode: string; slug: string }): string | null {
    if (!template) return null;

    const encodedCode = encodeURIComponent(context.stationCode);
    const encodedSlug = encodeURIComponent(context.slug);

    const rendered = template
      .replace(/\{station_code\}/g, encodedCode)
      .replace(/\{stationCode\}/g, encodedCode)
      .replace(/\{id\}/g, encodedCode)
      .replace(/\{slug\}/g, encodedSlug);

    return this.isSafeUrl(rendered) ? rendered : null;
  }

  /**
   * İstasyon ve operatör verisine göre derin bağlantıyı çözümler.
   */
  public static resolve(params: {
    operatorSlug: string;
    operatorName: string;
    stationCode: string;
    stationName: string;
    stationSlug: string;
    config?: DeepLinkConfigTemplate | null;
  }): DeepLinkResolution {
    const { operatorSlug, operatorName, stationCode, stationName, stationSlug, config } = params;

    const fallbackClipboardText = `${stationCode} - ${stationName}`;

    // Operatör konfigürasyonu yoksa doğrudan pano fallback'e düş
    if (!config) {
      return {
        operatorSlug,
        operatorName,
        stationCode,
        stationName,
        appSchemeUrl: null,
        universalLinkUrl: null,
        storeUrls: { ios: null, android: null },
        clipboardFallback: true,
        clipboardText: fallbackClipboardText,
        instructions: `'${operatorName}' için doğrudan uygulama içi yönlendirme mevcut değildir. İstasyon kodu panoya kopyalandı.`,
      };
    }

    const appSchemeUrl = this.interpolateTemplate(
      config.iosSchemeTemplate || config.androidSchemeTemplate,
      { stationCode, slug: stationSlug }
    );

    const universalLinkUrl = this.interpolateTemplate(
      config.universalLinkTemplate,
      { stationCode, slug: stationSlug }
    );

    const iosStore = this.isSafeUrl(config.storeUrls?.ios) ? config.storeUrls!.ios! : null;
    const androidStore = this.isSafeUrl(config.storeUrls?.android) ? config.storeUrls!.android! : null;

    const isClipboardFallback = config.clipboardFallback || (!appSchemeUrl && !universalLinkUrl);

    const instructions = isClipboardFallback
      ? `'${operatorName}' uygulaması için istasyon kodu panoya kopyalandı. Uygulamayı açtığınızda arama kutusuna yapıştırabilirsiniz.`
      : `'${operatorName}' mobil uygulamasında istasyonu açmak için yönlendiriliyorsunuz.`;

    return {
      operatorSlug,
      operatorName,
      stationCode,
      stationName,
      appSchemeUrl,
      universalLinkUrl,
      storeUrls: {
        ios: iosStore,
        android: androidStore,
      },
      clipboardFallback: isClipboardFallback,
      clipboardText: fallbackClipboardText,
      instructions,
    };
  }
}
