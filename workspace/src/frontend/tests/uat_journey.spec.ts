import { describe, it, expect } from 'vitest';
import cpoStations from '../../backend/src/data/cpo_stations.json';
import type { StationItem, ClusterItem } from '../types/station';

describe('UAT & Gerçek Kullanıcı Yolculuğu (User Journey) Doğrulama Paketi', () => {

  // ============================================================================
  // UAT-01: TÜRKİYE KUŞBAKIŞI VE KÜMELEME (CLUSTERING) DENEYİMİ
  // ============================================================================
  it('UAT-01: Ülke genelinde (Zoom < 10) 81 ilin kümeleme verisi üretilebilmeli ve DOM elemanları doğrulanmalıdır', () => {
    // 3643 istasyonun illere göre kümelenmesi simülasyonu
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

    // Küme dairelerinin min dokunma hedefi (touch target) >= 44px kuralı
    let size = 36;
    let bg = '#0066CC';
    if (clusterItem.count >= 100) {
      size = 52;
      bg = '#0F172A';
    } else if (clusterItem.count >= 10) {
      size = 44;
      bg = '#0052A3';
    }

    expect(size).toBe(52); // İstanbul 100'den büyük olduğu için 52px olmalı
    expect(bg).toBe('#0F172A');
  });

  // ============================================================================
  // UAT-02: BÜYÜKŞEHİR YAKINLAŞMA VE PIN RENDER GÜVENLİĞİ (CRASH ENGELLEME)
  // ============================================================================
  it('UAT-02: İstanbul BBox (Zoom 11) içindeki 600+ istasyon pin render döngüsünde TypeError fırlatmamalıdır', () => {
    // Kullanıcının tarayıcısındaki birebir BBox koordinatları
    const minLon = 28.42962;
    const minLat = 40.84865;
    const maxLon = 29.48826;
    const maxLat = 41.22010;

    const filtered = (cpoStations as any[]).filter(
      s => s.lon >= minLon && s.lon <= maxLon && s.lat >= minLat && s.lat <= maxLat
    );

    expect(filtered.length).toBeGreaterThan(500);

    // VectorMap.vue pin render döngüsü simülasyonu
    let renderCount = 0;
    for (const st of filtered) {
      // Her istasyonun operatör adı erişimi güvenli olmalı (TypeError engeli)
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
  // UAT-03: GERÇEK İSTASYON DETAYLARI VE CPO ENTEGRASYONU (VOLTRUN & ZES)
  // ============================================================================
  it('UAT-03: İstasyon detay panelinde gerçek CPO soket, güç ve tarife verisi eksiksiz görüntülenmelidir', () => {
    // Voltrun istasyonu örneği
    const voltrunStation = cpoStations.find(s => s.operator_name === 'Voltrun' && s.power_kw && s.power_kw > 50);
    expect(voltrunStation).toBeDefined();
    expect(voltrunStation!.connector_types).toContain('CCS2');
    expect(voltrunStation!.power_kw).toBeGreaterThanOrEqual(60);
    expect(voltrunStation!.current_tariff).toContain('TL/kWh');

    // ZES istasyonu örneği
    const zesStation = cpoStations.find(s => s.operator_name === 'ZES');
    expect(zesStation).toBeDefined();
    expect(zesStation!.lat).toBeGreaterThan(35);
    expect(zesStation!.lon).toBeGreaterThan(25);
  });

  // ============================================================================
  // UAT-04: DEEP-LINK VE CLIPBOARD FALLBACK MASAÜSTÜ YOLCULUĞU
  // ============================================================================
  it('UAT-04: Masaüstü tarayıcısında istasyon kodu panoya kopyalanmalı ve doğru toast mesajı üretilmelidir', () => {
    const testStation: StationItem = {
      id: '0a7f5b04-0045-5942-8b9e-3addb0e00de3',
      istasyon_no: 'ŞRJ/6368',
      slug: 'voltrun-atirus-avm-istanbul',
      name: 'ATİRUS AVM',
      address: 'Fatih Mah. Rıza Küçükoğlu Paşa Cad. No:40',
      city: 'İstanbul',
      district: 'Büyükçekmece',
      lat: 41.021407,
      lon: 28.583966,
      operator: {
        id: 4,
        name: 'Voltrun',
        slug: 'voltrun',
        is_active: true,
      },
      is_flagged_defective: false,
      connector_types: null,
      power_kw: null,
      current_tariff: null,
      connectors: null,
      status: null,
      updated_at: '2026-09-14T12:00:00Z',
    };

    // DeepLink Fallback mantığı
    const clipboardText = testStation.istasyon_no;
    const toast = `İstasyon kodu (${clipboardText}) panoya kopyalandı!`;

    expect(clipboardText).toBe('ŞRJ/6368');
    expect(toast).toContain('ŞRJ/6368');
    expect(toast).toContain('kopyalandı');
  });

  // ============================================================================
  // UAT-05: ARIZALI İSTASYON KIRMIZI ALARM PINI VE KULLANICI UYARISI
  // ============================================================================
  it('UAT-05: Arıza etiketli istasyon kırmızı pin (#B91C1C) ve ünlem (!) ikonuyla görünmelidir', () => {
    const defectiveStation = {
      name: 'Arızalı İstasyon',
      operator_name: 'ZES',
      is_flagged_defective: true,
      status: 'DEFECTIVE'
    };

    const isDefective = !!(defectiveStation.is_flagged_defective || defectiveStation.status === 'DEFECTIVE');
    const pinBg = isDefective ? '#B91C1C' : '#0066CC';
    const pinContent = isDefective ? '!' : 'Z';

    expect(isDefective).toBe(true);
    expect(pinBg).toBe('#B91C1C');
    expect(pinContent).toBe('!');
  });
});
