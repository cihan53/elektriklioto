
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FilterChips from '../components/map/FilterChips.vue';

describe('TALEP-050 (TALEP-032 reaktivasyonu): Operatör Menüsü Dış Alana Tıklandığında Kapanmalı', () => {
  let consoleErrorSpy: any;

  const mountFilterChips = () =>
    mount(FilterChips, {
      attachTo: document.body,
      props: {
        selectedOperator: '',
        isPublicOnly: false
      }
    });

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('TC-050-01: Menü açıkken sayfanın boş alanına tıklanınca menü kapanmalıdır', async () => {
    const wrapper = mountFilterChips();
    const opBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');
    expect(opBtn.exists()).toBe(true);

    await opBtn.trigger('click');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    expect(opBtn.attributes('aria-expanded')).toBe('true');

    // Menü dışındaki belge gövdesine pointerdown (dış alan tıklaması)
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(opBtn.attributes('aria-expanded')).toBe('false');

    wrapper.unmount();
  });

  it('TC-050-02: Menü içindeki arama kutusuna tıklamak menüyü KAPATMAMALIDIR', async () => {
    const wrapper = mountFilterChips();
    const opBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');

    await opBtn.trigger('click');
    const listbox = wrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);

    const searchInput = listbox.find('input[placeholder="Operatör ara..."]');
    expect(searchInput.exists()).toBe(true);

    // Menü İÇİNDEKİ öğeye pointerdown — dış alan sayılmamalı
    searchInput.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('TC-050-03: Escape tuşuna basıldığında açık menü kapanmalıdır', async () => {
    const wrapper = mountFilterChips();
    const opBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');

    await opBtn.trigger('click');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('TC-050-04: Tetikleyici butona tekrar tıklamak menüyü kapatmalıdır (flicker yok)', async () => {
    const wrapper = mountFilterChips();
    const opBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');

    await opBtn.trigger('click');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);

    // Aynı butona ikinci tıklama: outside-click handler içeride saymalı,
    // toggle tek sefer çalışıp menüyü kapatmalı (aç+kapa çakışması olmamalı)
    await opBtn.trigger('click');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('TC-050-05: Operatör seçimi menüyü kapatır ve seçimi emit eder', async () => {
    const wrapper = mountFilterChips();
    const opBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');

    await opBtn.trigger('click');
    const listbox = wrapper.find('[role="listbox"]');
    const zesBtn = listbox.findAll('button').find(b => b.text().includes('ZES'));
    expect(zesBtn).toBeDefined();

    await zesBtn!.trigger('click');
    expect(wrapper.emitted('update:selectedOperator')?.[0]).toEqual(['zes']);
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('TC-050-06: Dış alan tıklaması arama sorgusunu da sıfırlamalıdır', async () => {
    const wrapper = mountFilterChips();
    const opBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');

    await opBtn.trigger('click');
    const searchInput = wrapper.find('input[placeholder="Operatör ara..."]');
    await searchInput.setValue('zes');
    await wrapper.vm.$nextTick();

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);

    // Yeniden açıldığında arama alanı temiz olmalı
    await opBtn.trigger('click');
    const reopenedInput = wrapper.find('input[placeholder="Operatör ara..."]');
    expect((reopenedInput.element as HTMLInputElement).value).toBe('');

    wrapper.unmount();
  });

  it('TC-050-07: TALEP-007 regresyonu — dropdown overflow-x-auto şeridinin dışında kalmalıdır', async () => {
    const wrapper = mountFilterChips();
    const opBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');

    await opBtn.trigger('click');
    const listbox = wrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);
    expect(listbox.element.closest('.overflow-x-auto, .overflow-x-scroll, .overflow-auto')).toBeNull();

    wrapper.unmount();
  });
});
