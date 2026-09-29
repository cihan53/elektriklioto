
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { fetchGadmSearch } from '../components/map/geoSearch';
import SearchInput from '../components/map/SearchInput.vue';

const API_BASE = 'http://localhost:3001/api/v1';

const okJson = (data: unknown) =>
  ({ ok: true, status: 200, json: async () => data }) as any;

const errRes = (status: number) =>
  ({ ok: false, status, json: async () => ({}) }) as any;

const gadmSample = [
  {
    type: 'district',
    name: 'Esenler',
    display_name: 'Esenler, İstanbul',
    slug: 'esenler',
    province_name: 'İstanbul',
    district_name: 'Esenler',
    coordinates: { lat: 41.034, lon: 28.89 },
    bbox: { min_lon: 28.85, min_lat: 41.01, max_lon: 28.93, max_lat: 41.06 },
  },
];

describe('TALEP-049: SearchInput "./geoSearch" modül çözümlemesi ve GADM arama dayanıklılığı', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TC-T49-01: geoSearch modülü import edilebilir ve fetchGadmSearch fonksiyonu mevcut', () => {
    expect(typeof fetchGadmSearch).toBe('function');
  });

  it('TC-T49-02: GADM arama ucu q ve limit parametreleriyle çağrılır', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson(gadmSample));
    vi.stubGlobal('fetch', fetchMock);

    const items = await fetchGadmSearch(API_BASE, 'esenler', 15);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`${API_BASE}/geo/search`);
    expect(url).toContain('q=esenler');
    expect(url).toContain('limit=15');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Esenler');
    expect(items[0].province_name).toBe('İstanbul');
    expect(items[0].coordinates).toEqual({ lat: 41.034, lon: 28.89 });
  });

  it('TC-T49-03: birinci uç 404 dönerse gadm takma adına geri düşer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errRes(404))
      .mockResolvedValueOnce(okJson(gadmSample));
    vi.stubGlobal('fetch', fetchMock);

    const items = await fetchGadmSearch(API_BASE, 'esenler', 15);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0] as string).toContain('/gadm/search');
    expect(items).toHaveLength(1);
  });

  it('TC-T49-04: tüm uçlar erişilemezse [] döner (bileşen statik listeye düşer)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const items = await fetchGadmSearch(API_BASE, 'esenler', 15);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(items).toEqual([]);
  });

  it('TC-T49-05: boş veya geçersiz sorgu API çağrısı yapmaz', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchGadmSearch(API_BASE, '', 15)).toEqual([]);
    expect(await fetchGadmSearch(API_BASE, '   ', 15)).toEqual([]);
    expect(await fetchGadmSearch('', 'esenler', 15)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('TC-T49-06: bozuk JSON yükü [] döner, bileşeni çökertmez', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ not: 'an-array' }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchGadmSearch(API_BASE, 'esenler', 15)).toEqual([]);
  });

  it('TC-T49-07: SearchInput bileşeni geoSearch importuyla birlikte hatasız render edilir', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(gadmSample)));

    const wrapper = mount(SearchInput, { props: { modelValue: '' } });
    const input = wrapper.find('input[type="text"]');

    expect(input.exists()).toBe(true);
    expect(input.attributes('aria-label')).toBeTruthy();
  });

  it('TC-T49-08: Esenler gibi örneklem dışı ilçeler GADM yanıtıyla ilçe sonuçlarında görünür', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(gadmSample)));

    const wrapper = mount(SearchInput, { props: { modelValue: '' } });
    await wrapper.find('input[type="text"]').setValue('esenler');
    await new Promise((r) => setTimeout(r, 350));

    expect(wrapper.text()).toContain('Esenler');
    expect(wrapper.text()).toContain('İstanbul');
  });
});
