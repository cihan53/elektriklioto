import { ref } from 'vue';
import { vi } from 'vitest';

const stateMap = new Map<string, any>();

(globalThis as any).useState = (key: string, init?: () => any) => {
  if (!stateMap.has(key)) {
    stateMap.set(key, ref(init ? init() : undefined));
  }
  return stateMap.get(key);
};

(globalThis as any).useRuntimeConfig = () => ({
  public: {
    apiBase: 'http://localhost:3001/api/v1',
    mapTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    proximitySecret: 'elektriklioto-proximity-secret-key-32b!'
  }
});

(globalThis as any).useCookie = (name: string, opts?: any) => {
  return ref('system');
};

(globalThis as any).$fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
  if (url.includes('/operators')) {
    return [
      { id: 1, name: 'ZES', slug: 'zes', is_active: true },
      { id: 2, name: 'Trugo', slug: 'trugo', is_active: true },
      { id: 4, name: 'Voltrun', slug: 'voltrun', is_active: true }
    ];
  }
  if (url.includes('/health/sources')) {
    return {
      status: 'UP',
      total_sources: 2,
      healthy_sources: 2,
      stale_sources: 0,
      sources: [
        {
          id: 1,
          source_name: 'ZES Canlı Veri Ucu',
          circuit_state: 'CLOSED',
          is_healthy: true,
          last_successful_sync: new Date().toISOString()
        }
      ]
    };
  }
  return { data: [] };
});
