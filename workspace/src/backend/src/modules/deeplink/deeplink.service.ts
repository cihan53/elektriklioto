
import { DeepLinkResult, OperatorDeepLinkConfig } from './deeplink.types.js';

const ALLOWED_SCHEMES = ['zes://', 'trugo://', 'esarj://', 'https://apps.apple.com', 'https://play.google.com'];

export class DeepLinkService {
  /**
   * İstasyon ve operatör için deep-link veya clipboard fallback üretir.
   */
  public generateDeepLink(
    operatorName: string,
    stationNo: string,
    config?: OperatorDeepLinkConfig | null
  ): DeepLinkResult {
    const stationCode = stationNo.replace(/^ŞRJ\//i, '').replace(/^SRJ\//i, '');

    // 1. Bilinen operatör şemaları
    const opLower = operatorName.toLowerCase();
    let templateScheme: string | null = null;

    if (config?.scheme) {
      templateScheme = config.scheme;
    } else if (opLower.includes('zes')) {
      templateScheme = 'zes://station/{station_code}';
    } else if (opLower.includes('trugo')) {
      templateScheme = 'trugo://charge?station={station_code}';
    } else if (opLower.includes('esarj') || opLower.includes('eşarj')) {
      templateScheme = 'esarj://station/{station_code}';
    }

    if (templateScheme) {
      // Whitelist denetimi
      const isAllowed = ALLOWED_SCHEMES.some((prefix) => templateScheme!.startsWith(prefix));
      if (isAllowed) {
        const url = templateScheme.replace('{station_code}', stationCode);
        return {
          deep_link_url: url,
          clipboard_fallback: false,
          clipboard_text: null,
        };
      }
    }

    // 2. Desteklenmeyen veya bilinmeyen operatör -> Clipboard Fallback
    return {
      deep_link_url: null,
      clipboard_fallback: true,
      clipboard_text: stationNo,
    };
  }
}

export const deepLinkService = new DeepLinkService();
