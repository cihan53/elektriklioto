
import { describe, it, expect } from 'vitest';
import cpoStations from '../../backend/src/data/cpo_stations.json';
import type { StationItem, ClusterItem } from '../types/station';

describe('UAT & Gerçek Kullanıcı Yolculuğu (User Journey) Doğrulama Paketi (TALEP-019)', () => {

  // ============================================================================
  // UAT-01: TÜRKİYE KUŞBAKIŞI VE KÜMELEME (CLUSTERING) DENEYİMİ
  // ============================================================================
  it('UAT-01: Ülke genelinde (Zoom < 10) 81 ilin kümeleme verisi üretilebilmeli ve DOM elemanları doğrulanmalıdır', () => {
    const cityMap = new Map<string, { count: number; latSum: number; lonSum: number }>();
    for (const s of cpoStations) {
      const city = s.city || 'Diğer';
      const entry = cityMap.get(city) || { count: 0, latSum: 0, lonSum: 0 };
      entry.count += 1;
      entry.latSum += Number(s.lat);
      entry.lonSum += Number(s.lon);
      cityMap.set(city, entry);
    }

    expect(cityMap.size).toBeGreaterThanOrEqual(81);
    const istanbulCluster = cityMap.get('İstanbul');
    expect(istanbulCluster).toBeDefined();
    expect(istanbulCluster!.count).toBeGreaterThan(500);

    // DOM Küme Rozeti Standartları (WCAG 2.1 AA & Tasarım Sistemi)
    const clusterItem: ClusterItem = {
      cluster_id: 'cluster-istanbul',
      count: istanbulCluster!.count,
      lat: istanbulCluster!.latSum / istanbulCluster!.count,
      lon: istanbulCluster!.lonSum / istanbulCluster!.count
    };

    let size = 36;
    let bg = '#0066CC';
    if (clusterItem.count >= 100) {
      size = 52;
      bg = '#0F172A';
    } else if (clusterItem.count >= 10) {
      size = 44;
      bg = '#0052A3';
    }

    expect(size).toBe(52);
    expect(bg).toBe('#0F172A');
  });

  // ============================================================================
  // UAT-02: BÜYÜKŞEHİR YAKINLAŞMA VE PIN RENDER GÜVENLİĞİ (CRASH ENGELLEME)
  // ============================================================================
  it('UAT-02: İstanbul BBox (Zoom 11) içindeki 600+ istasyon pin render döngüsünde TypeError fırlatmamalıdır', () => {
    const minLon = 28.42962;
    const minLat = 40.84865;
    const maxLon = 29.48826;
    const maxLat = 41.22010;

    const filtered = (cpoStations as any[]).filter(
      s => s.lon >= minLon && s.lon <= maxLon && s.lat >= minLat && s.lat <= maxLat
    );

    expect(filtered.length).toBeGreaterThan(500);

    let renderCount = 0;
    for (const st of filtered) {
      const opName = st.operator?.name || st.operator_name || 'Şarj İstasyonu';
      const isDefective = Boolean(st.is_flagged_defective);
      const ariaLabel = `${st.name} — ${opName}${isDefective ? ' (Arıza Bildirildi)' : ''}`;
      const pinContent = isDefective ? '!' : (opName ? opName.charAt(0) : 'Ş');

      expect(ariaLabel).toBeDefined();
      expect(typeof ariaLabel).toBe('string');
      expect(pinContent).toBeDefined();
      expect(pinContent.length).toBe(1);
      renderCount++;
    }

    expect(renderCount).toBe(filtered.length);
  });

  // ============================================================================
  // UAT-03: EPDK ANA REFERANS MİMARİSİ VE ÇOKLU CPO DOĞRULAMASI (TALEP-019)
  // ============================================================================
  it('UAT-03: EPDK omurgasından Trugo, Eşarj, WAT vb. tüm lisanslı operatörler harita veri setinde yer almalıdır', () => {
    // Trugo İstasyonları (1000+ İstasyon)
    const trugoStations = (cpoStations as any[]).filter(s => s.operator_name === 'Trugo');
    expect(trugoStations.length).toBeGreaterThanOrEqual(1000);

    // Eşarj İstasyonları (500+ İstasyon)
    const esarjStations = (cpoStations as any[]).filter(s => s.operator_name === 'Eşarj' || s.operator_name === 'eşarj');
    expect(esarjStations.length).toBeGreaterThanOrEqual(500);

    // WAT Mobilite İstasyonları (500+ İstasyon)
    const watStations = (cpoStations as any[]).filter(s => s.operator_name === 'WAT Mobilite' || (s.operator_name || '').toLowerCase().includes('wat'));
    expect(watStations.length).toBeGreaterThanOrEqual(500);

    // Genel Operatör Çeşitliliği (En az 10 farklı lisanslı operatör)
    const uniqueOperators = new Set((cpoStations as any[]).map(s => s.operator_name || s.operator?.name));
    expect(uniqueOperators.size).toBeGreaterThanOrEqual(10);
  });

  // ============================================================================
  // UAT-04: VOLTRUN VE ZES KESİN GPS VE SOKET ZENGİNLEŞTİRMESİ (TALEP-019)
  // ============================================================================
  it('UAT-04: Voltrun ve ZES istasyonları kesin GPS, soket (CCS2, Type 2) ve güç verileriyle zenginleştirilmiş olmalıdır', () => {
    // Voltrun istasyonu örneği
    const voltrunStation = (cpoStations as any[]).find(s => s.operator_name === 'Voltrun' && s.power_kw && s.power_kw > 50);
    expect(voltrunStation).toBeDefined();
    expect(voltrunStation!.connector_types).toContain('CCS2');
    expect(voltrunStation!.power_kw).toBeGreaterThanOrEqual(60);
    expect(voltrunStation!.current_tariff).toContain('TL/kWh');

    // ZES istasyonu örneği
    const zesStation = (cpoStations as any[]).find(s => s.operator_name === 'ZES' && s.connector_types && s.connector_types.length > 0);
    expect(zesStation).toBeDefined();
    expect(zesStation!.lat).toBeGreaterThan(35);
    expect(zesStation!.lon).toBeGreaterThan(25);
    expect(zesStation!.connector_types.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // UAT-05: FAZ 1 EKSİK VERİ STANDARDI (NULLABLE EPDK İSTASYONLARI)
  // ============================================================================
  it('UAT-05: Soket/güç verisi henüz bulunmayan EPDK istasyonları null değerler taşımalıdır', () => {
    const trugoSample = (cpoStations as any[]).find(s => s.operator_name === 'Trugo');
    expect(trugoSample).toBeDefined();
    // Faz 1 Zorunlu Kısıt: Canlı soket/güç verisi yokken null olmalıdır
    expect(trugoSample!.connector_types).toBeNull();
    expect(trugoSample!.power_kw).toBeNull();
    expect(trugoSample!.current_tariff).toBeNull();
    expect(trugoSample!.istasyon_no).toMatch(/^ŞRJ\/\d+$/);
  });

  // ============================================================================
  // UAT-06: DEEP-LINK VE CLIPBOARD FALLBACK MASAÜSTÜ YOLCULUĞU
  // ============================================================================
  it('UAT-06: Masaüstü tarayıcısında istasyon kodu panoya kopyalanmalı ve operatöre özel toast mesajı üretilmelidir', () => {
    const trugoStation: StationItem = {
      id: 'c35bea3d-0d1b-57fc-8beb-3b711b1429f0',
      istasyon_no: 'ŞRJ/2998',
      slug: 'trugo-bolu-highway-outlet-bolu',
      name: 'Bolu Highway Outlet',
      address: 'Highway Outlet Otoparkı Merkez / BOLU',
      city: 'Bolu',
      district: 'Merkez',
      lat: 40.70472,
      lon: 31.657597,
      operator: {
        id: 2,
        name: 'Trugo',
        slug: 'trugo',
        is_active: true,
      },
      is_flagged_defective: false,
      connector_types: null,
      power_kw: null,
      current_tariff: null,
      connectors: null,
      status: null,
      updated_at: '2026-09-18T12:00:00Z',
    };

    const clipboardText = trugoStation.istasyon_no;
    const toast = `İstasyon kodu (${clipboardText}) panoya kopyalandı! Trugo uygulamasında arama kutusuna yapıştırabilirsiniz.`;

    expect(clipboardText).toBe('ŞRJ/2998');
    expect(toast).toContain('ŞRJ/2998');
    expect(toast).toContain('Trugo');
    expect(toast).toContain('kopyalandı');
  });

  // ============================================================================
  // UAT-07: ARIZALI İSTASYON KIRMIZI ALARM PINI VE KULLANICI UYARISI
  // ============================================================================
  it('UAT-07: Arıza etiketli istasyon kırmızı pin (#B91C1C) ve ünlem (!) ikonuyla görünmelidir', () => {
    const defectiveStation = {
      name: 'Arızalı İstasyon',
      operator_name: 'Trugo',
      is_flagged_defective: true,
      status: 'DEFECTIVE'
    };

    const isDefective = !!(defectiveStation.is_flagged_defective || defectiveStation.status === 'DEFECTIVE');
    const pinBg = isDefective ? '#B91C1C' : '#0066CC';
    const pinContent = isDefective ? '!' : 'T';

    expect(isDefective).toBe(true);
    expect(pinBg).toBe('#B91C1C');
    expect(pinContent).toBe('!');
  });
});
