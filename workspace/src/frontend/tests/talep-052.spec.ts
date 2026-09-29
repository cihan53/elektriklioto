
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { useClickOutside } from '../composables/useClickOutside';
import FilterChips from '../components/map/FilterChips.vue';

describe('TALEP-052: useClickOutside composable modül çözümlemesi ve davranışı', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('TC-052-01: ~/composables/useClickOutside modülü import edilebilir ve fonksiyon mevcut', () => {
    expect(typeof useClickOutside).toBe('function');
  });

  it('TC-052-02: Hedef öğe dışına pointerdown handler\'ı tetikler, içine tıklama tetiklemez', async () => {
    const spy = vi.fn();
    const Probe = defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null);
        useClickOutside(root, spy);
        return () => h('div', { ref: root }, [h('button', { class: 'inside-btn' })]);
      }
    });

    const wrapper = mount(Probe, { attachTo: document.body });
    const insideBtn = wrapper.find('.inside-btn');

    insideBtn.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(spy).not.toHaveBeenCalled();

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('TC-052-03: Escape tuşu handler\'ı tetikler, diğer tuşlar tetiklemez', () => {
    const spy = vi.fn();
    const Probe = defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null);
        useClickOutside(root, spy);
        return () => h('div', { ref: root });
      }
    });

    const wrapper = mount(Probe, { attachTo: document.body });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(spy).not.toHaveBeenCalled();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('TC-052-04: Bileşen kaldırıldığında dinleyiciler temizlenir (memory leak yok)', () => {
    const spy = vi.fn();
    const Probe = defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null);
        useClickOutside(root, spy);
        return () => h('div', { ref: root });
      }
    });

    const wrapper = mount(Probe, { attachTo: document.body });
    wrapper.unmount();

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('TC-052-05: Bileşen kapsamı dışında çağrılabilir ve dönen cleanup ile temizlenir', () => {
    const spy = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);

    const cleanup = useClickOutside(ref(target), spy);

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);

    target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);

    cleanup();

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('TC-052-06: FilterChips bileşeni useClickOutside importuyla hatasız render edilir', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const wrapper = mount(FilterChips, {
      attachTo: document.body,
      props: { selectedOperator: '', isPublicOnly: false }
    });
    expect(wrapper.find('button[aria-label="Operatör Filtresi"]').exists()).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    wrapper.unmount();
  });
});
