
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FilterChips from '../components/map/FilterChips.vue';
import SearchInput from '../components/map/SearchInput.vue';
import { useOperators } from '../composables/useOperators';

describe('TALEP-023: EPDK 170+ Lisanslı Operatör ve Marka Doğrulama Testleri', () => {
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

  it('TC-OP-01: useOperators veri tabanında en az 170 lisanslı EPDK operatörü bulunmalıdır', () => {
    const { operators } = useOperators();
    expect(operators.value).toBeInstanceOf(Array);
    expect(operators.value.length).toBeGreaterThanOrEqual(170);
    expect(operators.value.length).toBe(179);
  });

  it('TC-OP-02: Çekirdek ve bölgesel tüm EPDK markaları listede eksiksiz yer almalıdır', () => {
    const { operators } = useOperators();
    const slugs = operators.value.map(o => o.slug);
    const names = operators.value.map(o => o.name.toLowerCase());

    // Çekirdek 5 operatör
    expect(slugs).toContain('zes');
    expect(slugs).toContain('trugo');
    expect(slugs).toContain('esarj');
    expect(slugs).toContain('voltrun');
    expect(slugs).toContain('sharznet');

    // EPDK'da yer alan diğer 170+ şarj ağı işletmecisi/markaları
    expect(slugs).toContain('wat-mobilite');
    expect(slugs).toContain('astor');
    expect(slugs).toContain('en-yakit');
    expect(slugs).toContain('beefull');
    expect(slugs).toContain('aksa-sarj');
    expect(slugs).toContain('otopriz');
    expect(slugs).toContain('zeplin-car-rental');
    expect(slugs).toContain('otojet');

    // İsim araması doğrulaması
    expect(names.some(n => n.includes('zes'))).toBe(true);
    expect(names.some(n => n.includes('trugo'))).toBe(true);
    expect(names.some(n => n.includes('eşarj') || n.includes('esarj'))).toBe(true);
    expect(names.some(n => n.includes('astor'))).toBe(true);
    expect(names.some(n => n.includes('wat'))).toBe(true);
  });

  it('TC-OP-03: Tüm operatörlerin kimlik ve slug bilgileri standartlara ve URL güvenliğine uygun olmalıdır', () => {
    const { operators } = useOperators();
    const seenSlugs = new Set<string>();

    for (const op of operators.value) {
      expect(typeof op.id).toBe('number');
      expect(typeof op.slug).toBe('string');
      expect(op.slug.length).toBeGreaterThan(0);
      expect(op.slug).toMatch(/^[a-z0-9-]+$/);
      expect(typeof op.name).toBe('string');
      expect(op.name.length).toBeGreaterThan(0);
      expect(typeof op.is_active).toBe('boolean');

      expect(seenSlugs.has(op.slug)).toBe(false);
      seenSlugs.add(op.slug);
    }
  });

  it('TC-OP-04: FilterChips - Operatör menüsü 179 markayı listelemeli ve arama filtresi çalışmalıdır', async () => {
    const wrapper = mount(FilterChips, {
      props: {
        selectedOperator: '',
        isPublicOnly: false
      }
    });

    const opDropdownBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');
    expect(opDropdownBtn.exists()).toBe(true);
    expect(opDropdownBtn.text()).toContain('Tüm Operatörler');

    // Menüyü aç
    await opDropdownBtn.trigger('click');
    const listbox = wrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);

    // TALEP-007 Regresyon Koruması: Dropdown overflow-x-auto dışında olmalıdır
    expect(listbox.element.closest('.overflow-x-auto, .overflow-x-scroll, .overflow-auto')).toBeNull();

    // Tüm Operatörler başlığında 179 Marka sayısı görünmeli (yalnızca 5 marka DEĞİL)
    expect(listbox.text()).toContain('179 Marka');
    expect(listbox.text()).not.toContain('(5 Marka)');

    // Menüde en az 170 operatör seçeneği buton olarak listelenmeli
    const opButtons = listbox.findAll('button');
    expect(opButtons.length).toBeGreaterThanOrEqual(170);

    // Dropdown içi operatör arama kutusu kontrolü
    const searchInput = listbox.find('input[placeholder="Operatör ara..."]');
    expect(searchInput.exists()).toBe(true);

    // "aksa" araması
    await searchInput.setValue('aksa');
    await wrapper.vm.$nextTick();

    const filteredButtons = listbox.findAll('button');
    const filteredText = listbox.text().toLowerCase();
    expect(filteredText).toContain('aksa');
    expect(filteredButtons.length).toBeLessThan(170); // Filtrelenmiş liste
  });

  it('TC-OP-05: FilterChips - Seçilen operatör başarıyla emit edilmeli ve başlıkta güncellenmelidir', async () => {
    const wrapper = mount(FilterChips, {
      props: {
        selectedOperator: 'astor',
        isPublicOnly: false
      }
    });

    const opDropdownBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');
    expect(opDropdownBtn.text()).toContain('Astor');

    // Menüyü aç ve Trugo seç
    await opDropdownBtn.trigger('click');
    const listbox = wrapper.find('[role="listbox"]');
    const trugoBtn = listbox.findAll('button').find(b => b.text().includes('Trugo'));
    expect(trugoBtn).toBeDefined();

    await trugoBtn!.trigger('click');
    expect(wrapper.emitted('update:selectedOperator')).toBeDefined();
    expect(wrapper.emitted('update:selectedOperator')?.[0]).toEqual(['trugo']);
  });

  it('TC-OP-06: SearchInput - 179 operatör arasından arama yapabilmeli ve operatör seçebilmelidir', async () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: ''
      }
    });

    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);

    // "wat" yazıldığında "Wat Mobilite" operatörü önerilmelidir
    await input.setValue('wat');
    await new Promise(resolve => setTimeout(resolve, 250));
    await wrapper.vm.$nextTick();

    const dropdown = wrapper.find('.absolute.left-0');
    expect(dropdown.exists()).toBe(true);
    expect(dropdown.text().toLowerCase()).toContain('wat');

    // Operatör öğesine tıklama
    const opItem = wrapper.findAll('button').find(b => b.text().toLowerCase().includes('wat'));
    expect(opItem).toBeDefined();
    await opItem!.trigger('click');

    expect(wrapper.emitted('selectOperator')).toBeDefined();
    expect(wrapper.emitted('selectOperator')?.[0]).toEqual(['wat-mobilite']);
  });
});
