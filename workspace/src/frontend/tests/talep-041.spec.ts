
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FilterChips from '../components/map/FilterChips.vue';
import { useOperators, sortOperatorsByStationCount } from '../composables/useOperators';
import type { OperatorItem } from '../types/station';

describe('TALEP-041: Tüm Operatörler Menüsü İstasyon Sayısına Göre Sıralama Testleri', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error');
    consoleWarnSpy = vi.spyOn(console, 'warn');
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('TC-T41-01: useOperators listesi istasyon sayısına göre çoktan aza sıralı olmalıdır', () => {
    const { operators } = useOperators();
    expect(operators.value.length).toBe(179);

    for (let i = 1; i < operators.value.length; i++) {
      const prev = operators.value[i - 1].station_count ?? 0;
      const curr = operators.value[i].station_count ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('TC-T41-02: En yaygın operatörler listenin en üstünde yer almalıdır', () => {
    const { operators } = useOperators();
    const slugs = operators.value.map(o => o.slug);

    expect(slugs[0]).toBe('zes');      // 1940 istasyon
    expect(slugs[1]).toBe('trugo');    // 1376 istasyon
    expect(slugs[2]).toBe('voltrun');  // 1147 istasyon
    expect(slugs[3]).toBe('esarj');    // 763 istasyon

    // Ham JSON sırasında Eşarj, Voltrun'dan önceydi; sıralama Voltrun'u üste taşımalı
    expect(slugs.indexOf('voltrun')).toBeLessThan(slugs.indexOf('esarj'));
  });

  it('TC-T41-03: API birleştirmesi sonrası sıralama korunmalıdır', async () => {
    const { operators, fetchOperators } = useOperators();
    await fetchOperators(true);

    for (let i = 1; i < operators.value.length; i++) {
      const prev = operators.value[i - 1].station_count ?? 0;
      const curr = operators.value[i].station_count ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
    expect(operators.value[0].slug).toBe('zes');
  });

  it('TC-T41-04: Eşit istasyon sayılarında Türkçe alfabetik sıralama uygulanmalıdır', () => {
    const input: OperatorItem[] = [
      { id: 1, name: 'Zebra', slug: 'zebra', is_active: true, station_count: 100 },
      { id: 2, name: 'Astor', slug: 'astor', is_active: true, station_count: 100 },
      { id: 3, name: 'İstasyonX', slug: 'istasyonx', is_active: true, station_count: 100 },
      { id: 4, name: 'Üstün', slug: 'ustun', is_active: true, station_count: 50 },
    ];
    const sorted = sortOperatorsByStationCount(input);

    expect(sorted.map(o => o.slug)).toEqual(['astor', 'istasyonx', 'zebra', 'ustun']);
    // Girdi dizisi yerinde değişmemeli (immutability)
    expect(input[0].slug).toBe('zebra');
  });

  it('TC-T41-05: FilterChips dropdown operatörleri istasyon sayısına göre azalan sırada listelemelidir', async () => {
    const wrapper = mount(FilterChips, {
      props: {
        selectedOperator: '',
        isPublicOnly: false
      }
    });

    const opDropdownBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');
    await opDropdownBtn.trigger('click');

    const listbox = wrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);

    const scrollList = listbox.find('.overflow-y-auto');
    expect(scrollList.exists()).toBe(true);

    const opButtons = scrollList.findAll('button');
    expect(opButtons.length).toBeGreaterThanOrEqual(170);

    // İlk 5 operatör istasyon sayısına göre sıralı gelmelidir
    const firstFiveText = opButtons.slice(0, 5).map(b => b.text());
    expect(firstFiveText[0]).toContain('ZES');
    expect(firstFiveText[1]).toContain('Trugo');
    expect(firstFiveText[2]).toContain('Voltrun');
    expect(firstFiveText[3]).toContain('Eşarj');
    expect(firstFiveText[4]).toContain('Wat Mobilite');

    // Tüm listedeki istasyon sayısı rozetleri azalan sırada olmalıdır
    const counts = opButtons.map(b => {
      const m = b.text().match(/\((\d+)\)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i]);
    }
  });

  it('TC-T41-06: Dropdown içi arama filtresi sonuçları da istasyon sayısı sırasını korumalıdır', async () => {
    const wrapper = mount(FilterChips, {
      props: {
        selectedOperator: '',
        isPublicOnly: false
      }
    });

    const opDropdownBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');
    await opDropdownBtn.trigger('click');

    const listbox = wrapper.find('[role="listbox"]');
    const searchInput = listbox.find('input[placeholder="Operatör ara..."]');
    expect(searchInput.exists()).toBe(true);

    await searchInput.setValue('a');
    await wrapper.vm.$nextTick();

    const scrollList = listbox.find('.overflow-y-auto');
    const opButtons = scrollList.findAll('button');
    expect(opButtons.length).toBeGreaterThan(1);
    expect(opButtons.length).toBeLessThan(179);

    const counts = opButtons.map(b => {
      const m = b.text().match(/\((\d+)\)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i]);
    }
  });
});
