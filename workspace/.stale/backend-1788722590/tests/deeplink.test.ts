
import { describe, it, expect } from 'vitest';
import { DeepLinkService } from '../src/modules/deeplink/deeplink.service.js';

describe('DeepLinkService Birim Testleri', () => {
  it('İzinli protokolleri güvenli kabul etmeli, javascript ve data şemalarını engellemelidir', () => {
    expect(DeepLinkService.isSafeUrl('zes://station/ŞRJ/1042')).toBe(true);
    expect(DeepLinkService.isSafeUrl('trugo://charge?station=123')).toBe(true);
    expect(DeepLinkService.isSafeUrl('https://apps.apple.com/app/123')).toBe(true);
    
    // Tehlikeli protokoller
    expect(DeepLinkService.isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(DeepLinkService.isSafeUrl('data:text/html,<script>')).toBe(false);
    expect(DeepLinkService.isSafeUrl('file:///etc/passwd')).toBe(false);
    expect(DeepLinkService.isSafeUrl('custommalicious://exploit')).toBe(false);
  });

  it('ZES için doğru derin bağlantı parametrelerini üretmelidir', () => {
    const res = DeepLinkService.resolve({
      operatorSlug: 'zes',
      operatorName: 'Zorlu Energy Solutions (ZES)',
      stationCode: 'ŞRJ/1042',
      stationName: 'Tepe Nautilus AVM',
      stationSlug: 'tepe-nautilus-avm',
      config: {
        iosSchemeTemplate: 'zes://station/{station_code}',
        androidSchemeTemplate: 'zes://station/{station_code}',
        universalLinkTemplate: 'https://app.zes.net/station/{station_code}',
        storeUrls: {
          ios: 'https://apps.apple.com/app/zes',
          android: 'https://play.google.com/store/apps/zes',
        },
        clipboardFallback: false,
      },
    });

    expect(res.clipboardFallback).toBe(false);
    expect(res.appSchemeUrl).toBe('zes://station/%C5%9ERJ%2F1042');
    expect(res.universalLinkUrl).toBe('https://app.zes.net/station/%C5%9ERJ%2F1042');
    expect(res.clipboardText).toBe('ŞRJ/1042 - Tepe Nautilus AVM');
  });

  it('Yapılandırması olmayan veya bilinmeyen operatörler için clipboard_fallback: true dönmelidir', () => {
    const res = DeepLinkService.resolve({
      operatorSlug: 'bilinmeyen-operator',
      operatorName: 'Bilinmeyen A.Ş.',
      stationCode: 'ŞRJ/8888',
      stationName: 'Dinlenme Tesisi',
      stationSlug: 'dinlenme-tesisi',
      config: null,
    });

    expect(res.clipboardFallback).toBe(true);
    expect(res.appSchemeUrl).toBeNull();
    expect(res.universalLinkUrl).toBeNull();
    expect(res.clipboardText).toBe('ŞRJ/8888 - Dinlenme Tesisi');
    expect(res.instructions).toContain('İstasyon kodu panoya kopyalandı');
  });
});
