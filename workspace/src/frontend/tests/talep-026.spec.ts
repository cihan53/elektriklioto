import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ChangelogTimeline from '../components/common/ChangelogTimeline.vue';
import { useChangelog } from '../composables/useChangelog';
import GuncellemelerPage from '../pages/guncellemeler.vue';

describe('TALEP-026: Sürüm Notları ve Güncellemeler Ekranının Çözülen Taleplerle Senkronizasyonu', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error');
    consoleWarnSpy = vi.spyOn(console, 'warn');
    const { resetChangelog } = useChangelog();
    resetChangelog();
  });

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('TC-T26-01: ChangelogTimeline TALEP-014..TALEP-026 yeni müşteri taleplerini ve güncel sürümleri eksiksiz listelemelidir', () => {
    const wrapper = mount(ChangelogTimeline, {
      props: {
        autoSync: false,
      },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    const text = wrapper.text();

    // 1. Yeni ve güncel sürüm etiketleri
    expect(text).toContain('v1.4.0');
    expect(text).toContain('v1.3.0');
    expect(text).toContain('v1.2.0');
    expect(text).toContain('v1.1.0');

    // 2. Son çözülen müşteri talepleri (TALEP-014..TALEP-026)
    expect(text).toContain('TALEP-014');
    expect(text).toContain('TALEP-015');
    expect(text).toContain('TALEP-016');
    expect(text).toContain('TALEP-017');
    expect(text).toContain('TALEP-018');
    expect(text).toContain('TALEP-019');
    expect(text).toContain('TALEP-020');
    expect(text).toContain('TALEP-022');
    expect(text).toContain('TALEP-023');
    expect(text).toContain('TALEP-025');
    expect(text).toContain('TALEP-026');

    // 3. Toplam çözülen talep sayısı 20'nin üzerinde olmalıdır
    const items = wrapper.findAll('[data-testid="changelog-item"]');
    expect(items.length).toBeGreaterThanOrEqual(20);
  });

  it('TC-T26-02: TALEP-026 araması yapıldığında senkronizasyon hata çözümü bulunmalıdır', async () => {
    const wrapper = mount(ChangelogTimeline, {
      props: { autoSync: false },
    });

    const searchInput = wrapper.find('[data-testid="changelog-search-input"]');
    expect(searchInput.exists()).toBe(true);

    await searchInput.setValue('TALEP-026');
    const filteredItems = wrapper.findAll('[data-testid="changelog-item"]');
    expect(filteredItems.length).toBe(1);
    expect(filteredItems[0].text()).toContain('Sürüm Notları');
    expect(filteredItems[0].text()).toContain('Senkronize');
  });

  it('TC-T26-03: useChangelog composable dinamik reaktif verileri doğru hesaplamalıdır', () => {
    const { releases, latestVersion, totalResolvedCount, latestReleaseDate } = useChangelog();
    expect(releases.value.length).toBeGreaterThanOrEqual(9);
    expect(latestVersion.value).toBe('v1.4.0');
    expect(totalResolvedCount.value).toBeGreaterThanOrEqual(20);
    expect(latestReleaseDate.value).toContain('2026');
  });

  it('TC-T26-04: /guncellemeler sayfası aktif sürüm ve çözülen talep sayısını dinamik göstermelidir', () => {
    (globalThis as any).useHead = vi.fn();

    const wrapper = mount(GuncellemelerPage, {
      global: {
        stubs: {
          NuxtLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
          ChangelogTimeline: true,
        },
      },
    });

    const text = wrapper.text();
    expect(text).toContain('v1.4.0');
    expect(text).toContain('Müşteri Talebi');
    expect(text).toContain('26 Eylül 2026');
  });
});
