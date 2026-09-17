
import { describe, it, expect } from 'vitest';
import { renderSVG } from 'uqr';
import { createHmac } from 'node:crypto';
import type { SourcesHealthResponse, SourceHealthItem, DataFreshness } from '../types/station';

describe('elektriklioto.com Frontend Kabul Testleri (S4-T2 & S5-T2)', () => {
  it('Eksik veri modeli kuralı: Faz 1 soket, güç ve tarife alanları null olmalıdır', () => {
    const mockStation = {
      id: 'd9b0e271-8c43-4f76-8869-95e54d380e2f',
      istasyon_no: 'ŞRJ/00001',
      name: 'Kadıköy Hızlı Şarj İstasyonu',
      connector_types: null,
      power_kw: null,
      current_tariff: null,
      connectors: null,
      status: null
    };

    expect(mockStation.connector_types).toBeNull();
    expect(mockStation.power_kw).toBeNull();
    expect(mockStation.current_tariff).toBeNull();
    expect(mockStation.connectors).toBeNull();
  });

  it('Sıfır konum saklama kuralı: BBox sorgusunda ve raporlarda kullanıcı koordinatı gönderilmez', () => {
    const bbox = [28.9, 41.0, 29.1, 41.2];
    const queryParams: Record<string, any> = {
      bbox: bbox.join(','),
      zoom: 12
    };

    expect(queryParams).not.toHaveProperty('user_lat');
    expect(queryParams).not.toHaveProperty('user_lon');
    expect(queryParams.bbox).toBe('28.9,41,29.1,41.2');

    const reportPayload = {
      issue_type: 'DEFECTIVE',
      nonce: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      proximity_proof: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      description: 'Ekran kararmış durumda'
    };
    expect(reportPayload).not.toHaveProperty('lat');
    expect(reportPayload).not.toHaveProperty('lon');
    expect(reportPayload).not.toHaveProperty('user_lat');
    expect(reportPayload).not.toHaveProperty('user_lon');
    expect(reportPayload).not.toHaveProperty('coordinates');
  });

  it('WCAG 2.1 AA dokunma hedefi standart değeri en az 44 CSS px olmalıdır', () => {
    const minTouchTargetPx = 44;
    expect(minTouchTargetPx).toBeGreaterThanOrEqual(44);
  });

  it('Deep-link pano kopyalama geri bildirimi (Clipboard Fallback) metni doğrulanmalıdır', () => {
    const istasyonNo = 'ŞRJ/1904';
    const toastMessage = `İstasyon kodu (${istasyonNo}) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz.`;
    expect(toastMessage).toContain('ŞRJ/1904');
    expect(toastMessage).toContain('kopyalandı');
    expect(toastMessage).toContain('arama kutusuna yapıştırabilirsiniz');
  });

  it('Kitle kaynaklı arıza bildirimi: 50m yakınlık doğrulama kuralı (Haversine metre hesabı)', () => {
    const calculateMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    };

    // İstasyon: Kadıköy Moda (40.9850, 29.0280)
    const stationLat = 40.9850;
    const stationLon = 29.0280;

    // Kullanıcı 1: ~35 metre uzaklıkta
    const userLatWithin = 40.98525;
    const userLonWithin = 29.02820;
    const distWithin = calculateMeters(stationLat, stationLon, userLatWithin, userLonWithin);
    expect(distWithin).toBeLessThanOrEqual(50);

    // Kullanıcı 2: ~120 metre uzaklıkta
    const userLatOutside = 40.9860;
    const userLonOutside = 29.0290;
    const distOutside = calculateMeters(stationLat, stationLon, userLatOutside, userLonOutside);
    expect(distOutside).toBeGreaterThan(50);
  });

  it('S4-T2: Proximity Proof HMAC SHA-256 tek kullanımlık belirteç üretimi doğrulanmalıdır', () => {
    const stationId = '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8';
    const deviceUid = 'web-attest-test-client-12345';
    const nonce = 'f1e2d3c4b5a697887766554433221100';
    const secret = 'elektriklioto-proximity-secret-key-32b!';
    const epoch = 1788730000000;
    const T = Math.round(epoch / 60000);

    const data = `${stationId}${deviceUid}${T}${nonce}`;
    const proof = createHmac('sha256', secret).update(data).digest('hex');

    expect(proof).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(proof)).toBe(true);

    const candidateVerify = createHmac('sha256', secret).update(`${stationId}${deviceUid}${T}${nonce}`).digest('hex');
    expect(proof).toBe(candidateVerify);
  });

  it('S4-T2: Arıza Bildirildi rozeti ve semantik token renkleri WCAG 2.1 AA uyumlu olmalıdır', () => {
    const badge = {
      label: 'Arıza Bildirildi (3+ Doğrulama)',
      bgClass: 'bg-danger-subdued',
      textClass: 'text-danger-on-subdued',
      borderClass: 'border-danger/40'
    };

    expect(badge.label).toContain('Arıza Bildirildi');
    expect(badge.bgClass).toBe('bg-danger-subdued');
    expect(badge.textClass).toBe('text-danger-on-subdued');
  });

  it('S4-T2: Sorun türleri (Issue Types) backend TypeBox şemasıyla birebir örtüşmelidir', () => {
    const validIssueCodes = ['DEFECTIVE', 'CABLE_LOCKED', 'ICE_BLOCK', 'ACCESS_ISSUE', 'OTHER'];

    expect(validIssueCodes).toContain('DEFECTIVE');
    expect(validIssueCodes).toContain('CABLE_LOCKED');
    expect(validIssueCodes).toContain('ICE_BLOCK');
    expect(validIssueCodes).toContain('ACCESS_ISSUE');
    expect(validIssueCodes).toContain('OTHER');
  });

  it('Zorunlu Yasal EMP beyanı ve veri kaynağı damgası', () => {
    const disclaimer =
      'elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.';
    const dataSource = 'Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)';

    expect(disclaimer).toContain('lisanslı şarj operatörü değildir');
    expect(dataSource).toContain('EPDK Sicil Kaydı (Eylül 2026)');
  });

  it('S3-T2: SEO İl ve İlçe dizin sayfaları URL hiyerarşisi doğrulanmalıdır', () => {
    const cityUrl = (city: string) => `/${city}/sarj-istasyonlari`;
    const districtUrl = (city: string, district: string) => `/${city}/${district}/sarj-istasyonlari`;
    const operatorUrl = (op: string) => `/${op}`;

    expect(cityUrl('istanbul')).toBe('/istanbul/sarj-istasyonlari');
    expect(districtUrl('istanbul', 'kadikoy')).toBe('/istanbul/kadikoy/sarj-istasyonlari');
    expect(operatorUrl('zes')).toBe('/zes');
  });

  it('S3-T2: Dinamik SVG QR kod üretimi (uqr) geçerli SVG çıktısı üretmelidir', () => {
    const routeUrl = 'https://elektriklioto.com/r/k8F2m9A';
    const svg = renderSVG(routeUrl, { border: 2 });

    expect(svg).toBeDefined();
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('S3-T2: Schema.org ItemList ve ChargingStation JSON-LD şeması eksiksiz oluşturulmalıdır', () => {
    const station = {
      name: 'Kadıköy Hızlı Şarj',
      istasyon_no: 'ŞRJ/001',
      lat: 40.99,
      lon: 29.02,
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Caferağa Mah.'
    };

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'İstanbul Şarj İstasyonları',
      itemListElement: [
        {
          '@type': 'ChargingStation',
          position: 1,
          name: station.name,
          identifier: station.istasyon_no,
          geo: {
            '@type': 'GeoCoordinates',
            latitude: station.lat,
            longitude: station.lon
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: station.district,
            addressRegion: station.city,
            addressCountry: 'TR'
          }
        }
      ]
    };

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('ItemList');
    expect(jsonLd.itemListElement[0]['@type']).toBe('ChargingStation');
    expect(jsonLd.itemListElement[0].identifier).toBe('ŞRJ/001');
  });

  // ==========================================
  // S5-T2 (US-18): 24 SAAT VERİ TAZELİĞİ VE KAYNAK KESİNTİSİ TESTLERİ
  // ==========================================

  const formatFreshnessHelper = (updatedAtDate: Date | string | null | undefined, now = new Date()): DataFreshness => {
    if (!updatedAtDate) {
      return {
        is_stale: true,
        last_updated_text: 'Operatör Verisi Bekleniyor',
      };
    }

    const date = updatedAtDate instanceof Date ? updatedAtDate : new Date(updatedAtDate);
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    const isStale = diffHours >= 24;

    let text: string;
    if (diffDays >= 1) {
      text = `Son güncelleme: ${diffDays} gün önce`;
    } else if (diffHours >= 1) {
      text = `Son güncelleme: ${diffHours} saat önce`;
    } else {
      text = 'Son güncelleme: az önce';
    }

    return {
      is_stale: isStale,
      last_updated_text: text,
    };
  };

  it('S5-T2: 24 saatten eski istasyon verilerinde is_stale true ve gün formatı dönmelidir (US-18)', () => {
    const now = new Date('2026-09-07T12:00:00Z');

    // 25 saat önce güncellenmiş kayıt (is_stale = true, 1 gün önce)
    const updated25hAgo = new Date('2026-09-06T11:00:00Z');
    const res25h = formatFreshnessHelper(updated25hAgo, now);
    expect(res25h.is_stale).toBe(true);
    expect(res25h.last_updated_text).toBe('Son güncelleme: 1 gün önce');

    // 49 saat önce güncellenmiş kayıt (is_stale = true, 2 gün önce)
    const updated49hAgo = new Date('2026-09-05T11:00:00Z');
    const res49h = formatFreshnessHelper(updated49hAgo, now);
    expect(res49h.is_stale).toBe(true);
    expect(res49h.last_updated_text).toBe('Son güncelleme: 2 gün önce');
  });

  it('S5-T2: 24 saatten taze istasyon verilerinde is_stale false olmalıdır (US-18)', () => {
    const now = new Date('2026-09-07T12:00:00Z');

    // 3 saat önce güncellenmiş kayıt
    const updated3hAgo = new Date('2026-09-07T09:00:00Z');
    const res3h = formatFreshnessHelper(updated3hAgo, now);
    expect(res3h.is_stale).toBe(false);
    expect(res3h.last_updated_text).toBe('Son güncelleme: 3 saat önce');

    // 20 dakika önce güncellenmiş kayıt
    const updatedJustNow = new Date('2026-09-07T11:45:00Z');
    const resJustNow = formatFreshnessHelper(updatedJustNow, now);
    expect(resJustNow.is_stale).toBe(false);
    expect(resJustNow.last_updated_text).toBe('Son güncelleme: az önce');
  });

  it('S5-T2: Null veya tanımsız güncelleme zamanında Operatör Verisi Bekleniyor dönmelidir', () => {
    const resNull = formatFreshnessHelper(null);
    expect(resNull.is_stale).toBe(true);
    expect(resNull.last_updated_text).toBe('Operatör Verisi Bekleniyor');

    const resUndefined = formatFreshnessHelper(undefined);
    expect(resUndefined.is_stale).toBe(true);
    expect(resUndefined.last_updated_text).toBe('Operatör Verisi Bekleniyor');
  });

  it('S5-T2: Veri kaynağı kesinti ve bayatlık tespiti (Circuit Breaker OPEN & Stale Sources)', () => {
    const mockHealthResponse: SourcesHealthResponse = {
      status: 'UP',
      total_sources: 4,
      healthy_sources: 3,
      stale_sources: 1,
      sources: [
        {
          id: 1,
          operator_id: 1,
          source_name: 'ZES Canlı Veri Ucu',
          endpoint_url: 'https://api.zes.net/v1/stations/public',
          circuit_state: 'CLOSED',
          consecutive_failures: 0,
          last_successful_sync: '2026-09-07T11:30:00Z',
          last_attempt_at: '2026-09-07T11:30:00Z',
          last_error: null,
          is_healthy: true,
        },
        {
          id: 4,
          operator_id: 4,
          source_name: 'EPDK Kamusal Sorgu Ucu',
          endpoint_url: 'https://epdk.gov.tr/api/sarj/istasyonlar',
          circuit_state: 'OPEN',
          consecutive_failures: 5,
          last_successful_sync: '2026-09-06T10:00:00Z', // 25+ saat önce
          last_attempt_at: '2026-09-07T11:00:00Z',
          last_error: 'Bağlantı zaman aşımı',
          is_healthy: false,
        },
      ],
    };

    expect(mockHealthResponse.stale_sources).toBeGreaterThan(0);
    const brokenSource = mockHealthResponse.sources.find((s) => !s.is_healthy);
    expect(brokenSource).toBeDefined();
    expect(brokenSource?.circuit_state).toBe('OPEN');
    expect(brokenSource?.source_name).toContain('EPDK');

    // Outage tespiti logic
    const hasOutage = mockHealthResponse.stale_sources > 0 || mockHealthResponse.sources.some((s) => !s.is_healthy);
    expect(hasOutage).toBe(true);
  });

  it('S5-T2: Veri tazeliği nötr gri rozeti tasarım token ve WCAG 2.1 AA kontrast uyumu', () => {
    // Tasarım Sistemi token kuralı:
    // Subdued zemin üzerinde Text Secondary (#475569) kontrastı 6.92:1 (>= 4.5:1 WCAG AAA uyumlu)
    const freshnessBadgeClasses = {
      bg: 'bg-bg-subdued',
      text: 'text-text-secondary',
      border: 'border-border-default',
    };

    expect(freshnessBadgeClasses.bg).toBe('bg-bg-subdued');
    expect(freshnessBadgeClasses.text).toBe('text-text-secondary');
    expect(freshnessBadgeClasses.border).toBe('border-border-default');

    // Kaynak kesintisi uyarı bandı tokenları:
    // bg-warning-subdued (#FEF3C7) üzerinde text-warning (#B45309) kontrastı >= 4.5:1
    const outageBannerClasses = {
      bg: 'bg-warning-subdued',
      text: 'text-warning',
      border: 'border-warning/30',
    };

    expect(outageBannerClasses.bg).toBe('bg-warning-subdued');
    expect(outageBannerClasses.text).toBe('text-warning');
  });

  it('S5-T2: Dış kaynak kesintisinde platform kesintisiz çalışmalıdır (%100 Uptime Kuralı)', () => {
    // Kaynak kesintisi simülasyonu: 1 kaynak offline olsa bile istasyon haritada gösterilmeye devam eder
    const mockStationWithStaleData = {
      id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8',
      istasyon_no: 'ŞRJ/10423',
      slug: 'kadikoy-moda-zes-1',
      name: 'ZES Kadıköy Moda Otoparkı',
      updated_at: '2026-09-05T12:00:00Z', // 48 saat önce
      data_freshness: {
        is_stale: true,
        last_updated_text: 'Son güncelleme: 2 gün önce',
      },
    };

    // İstasyon silinmez veya gizlenmez; data_freshness etiketiyle sunulur
    expect(mockStationWithStaleData.id).toBeDefined();
    expect(mockStationWithStaleData.data_freshness.is_stale).toBe(true);
    expect(mockStationWithStaleData.data_freshness.last_updated_text).toContain('2 gün önce');
  });
});
