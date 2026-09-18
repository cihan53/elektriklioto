
/**
 * CPO ve EPDK Kamu/Açık Servis ve Uç Noktaları Tanım Kataloğu (TALEP-015)
 * 
 * EPDK ve Türkiye'de faaliyet gösteren lisanslı şarj operatörlerinin (ZES, Trugo, Eşarj, Voltrun vb.)
 * istasyon bilgilerinin çekileceği tespit edilmiş açık kamusal endpoint adresleri ve cron zamanlamaları.
 */

export interface CPOEndpointConfig {
  id: number;
  operatorId: number;
  operatorSlug: string;
  sourceName: string;
  brandName: string;
  primaryUrl: string;
  fallbackUrls: string[];
  docOrPortalUrl: string;
  authType: 'public' | 'none';
  dataType: 'json' | 'geojson' | 'html';
  syncIntervalMinutes: number;
  cronExpression: string;
  parserType: 'epdk' | 'zes' | 'trugo' | 'esarj' | 'voltrun' | 'sharz' | 'generic';
  description: string;
  active: boolean;
}

/**
 * Tespit edilen açık kamusal CPO ve EPDK servis uç noktaları
 */
export const CPO_ENDPOINTS: CPOEndpointConfig[] = [
  {
    id: 1,
    operatorId: 1,
    operatorSlug: 'zes',
    sourceName: 'ZES Canlı Veri Ucu',
    brandName: 'ZES',
    primaryUrl: 'https://api.zes.net/v1/stations/public',
    fallbackUrls: [
      'https://mapservice.zes.net/api/station/all',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/main/zes_stations.json',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/master/zes_stations.json',
    ],
    docOrPortalUrl: 'https://zes.net/harita',
    authType: 'public',
    dataType: 'json',
    syncIntervalMinutes: 15,
    cronExpression: '*/15 * * * *',
    parserType: 'zes',
    description: 'Zorlu Energy Solutions (ZES) Kamusal Şarj Ağı Uç Noktası (AC, DC ve HPC soketler)',
    active: true,
  },
  {
    id: 2,
    operatorId: 2,
    operatorSlug: 'trugo',
    sourceName: 'Trugo Canlı Veri Ucu',
    brandName: 'Trugo',
    primaryUrl: 'https://api.trugo.com.tr/v1/stations/public',
    fallbackUrls: [
      'https://mobileapi.trugo.com.tr/api/v1/locations',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/main/trugo_stations.json',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/master/trugo_stations.json',
    ],
    docOrPortalUrl: 'https://trugo.com.tr/istasyonlar',
    authType: 'public',
    dataType: 'json',
    syncIntervalMinutes: 15,
    cronExpression: '*/15 * * * *',
    parserType: 'trugo',
    description: 'Trugo Yüksek Hızlı DC Şarj İstasyonları Kamu API Ucu (180 kW / 300 kW)',
    active: true,
  },
  {
    id: 3,
    operatorId: 3,
    operatorSlug: 'esarj',
    sourceName: 'Eşarj Canlı Veri Ucu',
    brandName: 'Eşarj',
    primaryUrl: 'https://api.esarj.com/v1/stations/public',
    fallbackUrls: [
      'https://www.esarj.com/api/v1/stations',
      'https://network.esarj.com/api/v2/chargers',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/main/esarj_stations.json',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/master/esarj_stations.json',
    ],
    docOrPortalUrl: 'https://esarj.com/harita',
    authType: 'public',
    dataType: 'json',
    syncIntervalMinutes: 15,
    cronExpression: '*/15 * * * *',
    parserType: 'esarj',
    description: 'Eşarj Enerjisa Şarj İstasyonları Kamu Uç Noktası ve Soket Durumları',
    active: true,
  },
  {
    id: 4,
    operatorId: 0,
    operatorSlug: 'epdk',
    sourceName: 'EPDK Kamusal Sorgu Ucu',
    brandName: 'EPDK',
    primaryUrl: 'https://lisans.epdk.gov.tr/epvys-web/faces/pages/sarjAgiIsletmeciSorgula.xhtml',
    fallbackUrls: [
      'https://epdk.gov.tr/api/sarj/istasyonlar',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/main/istasyonlar.json',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/master/istasyonlar.json',
    ],
    docOrPortalUrl: 'https://www.epdk.gov.tr/Detay/Icerik/3-13144/sarj-hizmeti-yonetmeligi',
    authType: 'public',
    dataType: 'json',
    syncIntervalMinutes: 1440,
    cronExpression: '0 2 * * *',
    parserType: 'epdk',
    description: 'EPDK Kamusal Şarj İstasyonları ve Lisanslı İşletmeciler Sicil Listesi (16.788 istasyon)',
    active: true,
  },
  {
    id: 5,
    operatorId: 4,
    operatorSlug: 'voltrun',
    sourceName: 'Voltrun Canlı Veri Ucu',
    brandName: 'Voltrun',
    primaryUrl: 'https://api.voltrun.com/v1/stations/public',
    fallbackUrls: [
      'https://cp.voltrun.com/api/v1/chargers/public',
      'https://portal.voltrun.com/api/stations',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/main/voltrun_stations.json',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/master/voltrun_stations.json',
    ],
    docOrPortalUrl: 'https://portal.voltrun.com/istasyon-haritasi',
    authType: 'public',
    dataType: 'json',
    syncIntervalMinutes: 15,
    cronExpression: '*/15 * * * *',
    parserType: 'voltrun',
    description: 'Voltrun Açık Şarj İstasyonları, Soket ve Enerji Tarifesi API Ucu',
    active: true,
  },
  {
    id: 6,
    operatorId: 5,
    operatorSlug: 'sharz',
    sourceName: 'Sharz.net Canlı Veri Ucu',
    brandName: 'Sharz.net',
    primaryUrl: 'https://api.sharz.net/v1/stations/public',
    fallbackUrls: [
      'https://www.sharz.net/api/stations',
      'https://raw.githubusercontent.com/cihan53/elektriklioto/main/sharz_stations.json',
    ],
    docOrPortalUrl: 'https://sharz.net/istasyonlarimiz',
    authType: 'public',
    dataType: 'json',
    syncIntervalMinutes: 60,
    cronExpression: '0 * * * *',
    parserType: 'sharz',
    description: 'Sharz.net Kamusal İstasyon ve Şarj Ağı Bilgi Servisi',
    active: true,
  },
  {
    id: 7,
    operatorId: 6,
    operatorSlug: 'astor',
    sourceName: 'Astor Şarj Canlı Veri Ucu',
    brandName: 'Astor',
    primaryUrl: 'https://api.astorsarj.com/v1/stations/public',
    fallbackUrls: [
      'https://astorsarj.com/api/v1/locations',
    ],
    docOrPortalUrl: 'https://astorsarj.com',
    authType: 'public',
    dataType: 'json',
    syncIntervalMinutes: 60,
    cronExpression: '0 * * * *',
    parserType: 'generic',
    description: 'Astor Şarj İstasyonları Kamusal Sorgu Ucu',
    active: true,
  },
];
