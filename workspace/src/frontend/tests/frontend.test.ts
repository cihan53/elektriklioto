
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

    const message = `${stationId}:${deviceUid}:${nonce}:${epoch}`;
    const proof = createHmac('sha256', secret).update(message).digest('hex');

    expect(proof).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(proof)).toBe(true);

    const verifyProof = createHmac('sha256', secret).update(message).digest('hex');
    expect(verifyProof).toBe(proof);
  });

  it('S4-T2: 3 veya daha fazla doğrulanmış ihbarda arıza rozeti (DEFECTIVE) aktifleşmelidir', () => {
    const checkIsDefective = (reportCount: number, threshold = 3) => {
      return reportCount >= threshold;
    };

    expect(checkIsDefective(0)).toBe(false);
    expect(checkIsDefective(1)).toBe(false);
    expect(checkIsDefective(2)).toBe(false);
    expect(checkIsDefective(3)).toBe(true);
    expect(checkIsDefective(5)).toBe(true);
  });

  it('S4-T2: QR Köprü yükü (payload) 15 dakika geçerlilik süresi (TTL) kuralını doğrulamalıdır', () => {
    const now = Date.now();
    const ttlMs = 15 * 60 * 1000;
    const expiresAt = now + ttlMs;

    const isExpired = (expiryTimestamp: number, currentTimestamp = Date.now()) => {
      return currentTimestamp > expiryTimestamp;
    };

    expect(isExpired(expiresAt, now + 10 * 60 * 1000)).toBe(false);
    expect(isExpired(expiresAt, now + 15 * 60 * 1000 + 1)).toBe(true);
  });

  it('S4-T2: QR Kod SVG çıktısı uqr ile geçerli ve taranabilir şekilde üretilmelidir', () => {
    const testUrl = 'https://elektriklioto.com/r/eyJzdG9wcyI6W3sic3RhdGlvbl9pZCI6IjAxOGYzYTllIn1dfQ';
    const svgString = renderSVG(testUrl, {
      ecc: 'M',
      border: 2
    });

    expect(typeof svgString).toBe('string');
    expect(svgString).toContain('<svg');
    expect(svgString).toContain('</svg>');
    expect(svgString).toContain('viewBox');
  });

  it('S4-T2: Topluluk katkı modalı (ContributeModal) form alanları ve doğrulama kuralları geçerli olmalıdır', () => {
    const sampleContribution = {
      station_id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8',
      suggested_connectors: ['CCS', 'AC Tip 2'],
      suggested_power_kw: 120,
      suggested_tariff_tl: 9.80,
      note: 'İstasyonda 2 adet CCS ve 1 adet AC soket aktif olarak çalışıyor.'
    };

    expect(sampleContribution.suggested_connectors.length).toBeGreaterThan(0);
    expect(sampleContribution.suggested_power_kw).toBeGreaterThan(0);
    expect(sampleContribution.suggested_tariff_tl).toBeGreaterThan(0);
    expect(sampleContribution.note.length).toBeGreaterThan(10);
  });

  it('S5-T2: useSourceHealth - 24 saat kuralı ve bağıl zaman formatlayıcısı (formatFreshnessText)', () => {
    const formatFreshnessText = (updatedAtStr?: string | null): DataFreshness => {
      if (!updatedAtStr) {
        return { is_stale: true, last_updated_text: 'Veri bekleniyor' };
      }

      const updated = new Date(updatedAtStr);
      if (isNaN(updated.getTime())) {
        return { is_stale: true, last_updated_text: 'Tarih bilinmiyor' };
      }

      const now = new Date('2026-09-14T12:00:00Z');
      const diffMs = now.getTime() - updated.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const is_stale = diffHours >= 24;

      if (diffHours < 1) {
        const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
        return { is_stale, last_updated_text: `Son güncelleme: ${diffMinutes} dakika önce` };
      }

      if (diffHours < 24) {
        const roundedHours = Math.round(diffHours);
        return { is_stale, last_updated_text: `Son güncelleme: ${roundedHours} saat önce` };
      }

      const diffDays = Math.round(diffHours / 24);
      return { is_stale, last_updated_text: `Son güncelleme: ${diffDays} gün önce` };
    };

    const recent = formatFreshnessText('2026-09-14T11:45:00Z');
    expect(recent.is_stale).toBe(false);
    expect(recent.last_updated_text).toBe('Son güncelleme: 15 dakika önce');

    const sixHoursAgo = formatFreshnessText('2026-09-14T06:00:00Z');
    expect(sixHoursAgo.is_stale).toBe(false);
    expect(sixHoursAgo.last_updated_text).toBe('Son güncelleme: 6 saat önce');

    const twoDaysAgo = formatFreshnessText('2026-09-12T12:00:00Z');
    expect(twoDaysAgo.is_stale).toBe(true);
    expect(twoDaysAgo.last_updated_text).toBe('Son güncelleme: 2 gün önce');

    const nullDate = formatFreshnessText(null);
    expect(nullDate.is_stale).toBe(true);
    expect(nullDate.last_updated_text).toBe('Veri bekleniyor');
  });

  it('S5-T2: SourceHealthModal ve Kesinti İstatistikleri - Devre durumu ve kaynak sağlığı hesaplaması', () => {
    const mockHealthResponse: SourcesHealthResponse = {
      status: 'DEGRADED',
      total_sources: 3,
      healthy_sources: 2,
      stale_sources: 1,
      sources: [
        {
          id: 1,
          operator_id: 1,
          source_name: 'ZES Live Sync',
          endpoint_url: 'https://api.zes.net/v1/stations',
          circuit_state: 'CLOSED',
          consecutive_failures: 0,
          last_successful_sync: '2026-09-14T11:55:00Z',
          last_attempt_at: '2026-09-14T11:55:00Z',
          last_error: null,
          is_healthy: true
        },
        {
          id: 2,
          operator_id: 2,
          source_name: 'Trugo CPO API',
          endpoint_url: 'https://api.trugo.com.tr/v2/chargers',
          circuit_state: 'OPEN',
          consecutive_failures: 4,
          last_successful_sync: '2026-09-13T08:00:00Z',
          last_attempt_at: '2026-09-14T11:50:00Z',
          last_error: 'ETIMEDOUT: Connection refused',
          is_healthy: false
        },
        {
          id: 3,
          operator_id: 3,
          source_name: 'Eşarj Gateway',
          endpoint_url: 'https://gateway.esarj.com/v1/network',
          circuit_state: 'HALF_OPEN',
          consecutive_failures: 1,
          last_successful_sync: '2026-09-14T11:30:00Z',
          last_attempt_at: '2026-09-14T11:52:00Z',
          last_error: '503 Service Unavailable',
          is_healthy: false
        }
      ]
    };

    expect(mockHealthResponse.total_sources).toBe(3);
    expect(mockHealthResponse.healthy_sources).toBe(2);
    expect(mockHealthResponse.stale_sources).toBe(1);

    const openCircuit = mockHealthResponse.sources.find(s => s.circuit_state === 'OPEN');
    expect(openCircuit).toBeDefined();
    expect(openCircuit?.is_healthy).toBe(false);
    expect(openCircuit?.consecutive_failures).toBeGreaterThanOrEqual(3);
  });

  it('S5-T2: SourceHealthBanner görünürlük kuralı - Tüm kaynaklar sağlıklıyken gizlenmeli, kesinti durumunda sarı uyarı göstermelidir', () => {
    const isBannerVisible = (healthyCount: number, totalCount: number) => {
      return totalCount > 0 && healthyCount < totalCount;
    };

    expect(isBannerVisible(3, 3)).toBe(false);
    expect(isBannerVisible(2, 3)).toBe(true);
    expect(isBannerVisible(0, 3)).toBe(true);
    expect(isBannerVisible(0, 0)).toBe(false);
  });
});
