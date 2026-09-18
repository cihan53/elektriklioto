import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ChangelogTimeline from '../components/common/ChangelogTimeline.vue';
import ChangelogModal from '../components/modals/ChangelogModal.vue';
import HeaderNav from '../components/common/HeaderNav.vue';

describe('TALEP-013: Değişiklik Günlüğü ve Sürüm Notları Test Paketi', () => {
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

  it('ChangelogTimeline: TALEP-001..TALEP-013 müşteri talepleri ve SemVer sürümleri eksiksiz listelenmelidir', () => {
    const wrapper = mount(ChangelogTimeline, {
      global: {
        stubs: {
          NuxtLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    const text = wrapper.text();

    // 1. Sürüm etiketleri
    expect(text).toContain('v1.0.0-faz2');
    expect(text).toContain('v0.9.5');
    expect(text).toContain('v0.9.0');
    expect(text).toContain('v0.8.0');
    expect(text).toContain('v0.7.0');

    // 2. Müşteri Talepleri (TALEP-001 .. TALEP-013)
    expect(text).toContain('TALEP-013');
    expect(text).toContain('TALEP-012');
    expect(text).toContain('TALEP-011');
    expect(text).toContain('TALEP-010');
    expect(text).toContain('TALEP-009');
    expect(text).toContain('TALEP-008');
    expect(text).toContain('TALEP-007');
    expect(text).toContain('TALEP-006');
    expect(text).toContain('TALEP-005');
    expect(text).toContain('TALEP-004');
    expect(text).toContain('TALEP-003');
    expect(text).toContain('TALEP-002');
    expect(text).toContain('TALEP-001');

    // 3. Çözüldü rozetleri
    const items = wrapper.findAll('[data-testid="changelog-item"]');
    expect(items.length).toBeGreaterThanOrEqual(13);
  });

  it('ChangelogTimeline: Arama kutusu ile filtreleme çalışmalıdır', async () => {
    const wrapper = mount(ChangelogTimeline);

    const searchInput = wrapper.find('[data-testid="changelog-search-input"]');
    expect(searchInput.exists()).toBe(true);

    // TALEP-002 araması yap
    await searchInput.setValue('TALEP-002');

    const filteredItems = wrapper.findAll('[data-testid="changelog-item"]');
    expect(filteredItems.length).toBe(1);
    expect(filteredItems[0].text()).toContain('Google Analytics');
    expect(filteredItems[0].text()).toContain('G-BKMTW8EH4K');
  });

  it('ChangelogModal: Açıldığında başlık, zaman çizelgesi ve kapatma aksiyonları erişilebilir olmalıdır', async () => {
    const wrapper = mount(ChangelogModal, {
      props: {
        isOpen: true
      },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    expect(wrapper.find('[data-testid="changelog-modal"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Sürüm Notları & Güncellemeler');
    expect(wrapper.text()).toContain('TALEP-013');

    // Kapatma butonu
    const closeBtn = wrapper.find('button[aria-label="Kapat"]');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('HeaderNav: Güncellemeler linki ve modal tetikleme butonu yer almalıdır', async () => {
    const wrapper = mount(HeaderNav, {
      global: {
        stubs: {
          NuxtLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          SourceHealthModal: true,
          AboutModal: true,
          ChangelogModal: true
        }
      }
    });

    // Menüdeki Güncellemeler linki
    const links = wrapper.findAll('nav a');
    const hrefs = links.map(l => l.attributes('href'));
    expect(hrefs).toContain('/guncellemeler');

    // Üst bardaki Güncellemeler modal butonu
    const changelogBtn = wrapper.find('button[aria-label="Sürüm Notları ve Güncellemeler"]');
    expect(changelogBtn.exists()).toBe(true);
    await changelogBtn.trigger('click');
  });
});
