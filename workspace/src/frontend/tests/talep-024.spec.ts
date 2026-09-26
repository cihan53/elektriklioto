import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FilterChips from '../components/map/FilterChips.vue';
import { useOperators } from '../composables/useOperators';

describe('TALEP-024: Operatör Menüsünde Sabit Arama, Tüm Markalar ve İstasyon Sayıları Testleri', () => {
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

  it('TC-T24-01: Operatör listesinde her markanın station_count değeri tanımlı ve pozitif olmalıdır', () => {
    const { operators } = useOperators();
    expect(operators.value.length).toBeGreaterThanOrEqual(170);

    const zes = operators.value.find(o => o.slug === 'zes');
    expect(zes).toBeDefined();
    expect(zes?.station_count).toBe(1940);

    const trugo = operators.value.find(o => o.slug === 'trugo');
    expect(trugo).toBeDefined();
    expect(trugo?.station_count).toBe(1376);

    const esarj = operators.value.find(o => o.slug === 'esarj');
    expect(esarj).toBeDefined();
    expect(esarj?.station_count).toBe(763);
  });

  it('TC-T24-02: Dropdown açıldığında sabit üst alanda Arama kutusu ve Tüm Markalar seçeneği bulunmalıdır', async () => {
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

    // Sabit (sticky) üst alan kontrolü
    const stickyHeader = listbox.find('.sticky.top-0');
    expect(stickyHeader.exists()).toBe(true);

    // Arama kutusu sabit alanın içinde olmalı
    const searchInput = stickyHeader.find('input[placeholder="Operatör ara..."]');
    expect(searchInput.exists()).toBe(true);

    // Tüm Markalar butonu sabit alanın içinde olmalı
    const allBrandsBtn = stickyHeader.find('button[aria-label="Tüm Markaları Göster"]');
    expect(allBrandsBtn.exists()).toBe(true);
    expect(allBrandsBtn.text()).toContain('Tüm Markalar');
    expect(allBrandsBtn.text()).toContain('179 Marka');
  });

  it('TC-T24-03: Her operatör seçeneğinin yanında istasyon sayısı parantez/rozet içinde gösterilmelidir', async () => {
    const wrapper = mount(FilterChips, {
      props: {
        selectedOperator: '',
        isPublicOnly: false
      }
    });

    const opDropdownBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');
    await opDropdownBtn.trigger('click');

    const listbox = wrapper.find('[role="listbox"]');

    // ZES butonunu bul ve istasyon sayısını kontrol et
    const zesBtn = listbox.findAll('button').find(b => b.text().includes('ZES'));
    expect(zesBtn).toBeDefined();
    expect(zesBtn!.text()).toContain('1940');

    // Trugo butonunu bul ve istasyon sayısını kontrol et
    const trugoBtn = listbox.findAll('button').find(b => b.text().includes('Trugo'));
    expect(trugoBtn).toBeDefined();
    expect(trugoBtn!.text()).toContain('1376');
  });

  it('TC-T24-04: Tüm Markalar seçeneğine tıklandığında seçili operatör sıfırlanmalıdır', async () => {
    const wrapper = mount(FilterChips, {
      props: {
        selectedOperator: 'zes',
        isPublicOnly: false
      }
    });

    const opDropdownBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');
    expect(opDropdownBtn.text()).toContain('ZES');

    await opDropdownBtn.trigger('click');
    const listbox = wrapper.find('[role="listbox"]');
    const allBrandsBtn = listbox.find('button[aria-label="Tüm Markaları Göster"]');
    expect(allBrandsBtn.exists()).toBe(true);

    await allBrandsBtn.trigger('click');
    expect(wrapper.emitted('update:selectedOperator')).toBeDefined();
    expect(wrapper.emitted('update:selectedOperator')?.[0]).toEqual(['']);
  });
});
