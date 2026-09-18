import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { useVersionCheck } from '../composables/useVersionCheck';
import UpdateNotificationModal from '../components/modals/UpdateNotificationModal.vue';

describe('useVersionCheck & UpdateNotificationModal (TALEP-012)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const { resetUpdate } = useVersionCheck();
    resetUpdate();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('başlangıçta güncelleme uyarısı kapalı olmalıdır', () => {
    const { isUpdateAvailable, countdown } = useVersionCheck();
    expect(isUpdateAvailable.value).toBe(false);
    expect(countdown.value).toBe(20);
  });

  it('yeni sürüm tespit edildiğinde (triggerUpdate) 20 saniyelik geri sayım başlamalıdır', () => {
    const { isUpdateAvailable, countdown, triggerUpdate } = useVersionCheck();
    triggerUpdate('new-build-123', '1.0.1');

    expect(isUpdateAvailable.value).toBe(true);
    expect(countdown.value).toBe(20);

    // 5 saniye ilerlet
    vi.advanceTimersByTime(5000);
    expect(countdown.value).toBe(15);

    // 10 saniye daha ilerlet
    vi.advanceTimersByTime(10000);
    expect(countdown.value).toBe(5);
  });

  it('20 saniye dolduğunda otomatik reload çağrılmalıdır', () => {
    const { triggerUpdate } = useVersionCheck();
    const reloadMock = vi.fn();

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    triggerUpdate('new-build-999');

    // 20 saniye ilerlet
    vi.advanceTimersByTime(20000);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('Şimdi Yenile butonuna tıklandığında anında reload çalışmalıdır', async () => {
    const { triggerUpdate } = useVersionCheck();
    const reloadMock = vi.fn();

    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    const wrapper = mount(UpdateNotificationModal, {
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    triggerUpdate('new-build-click-test');
    await wrapper.vm.$nextTick();

    const btn = wrapper.find('[data-testid="reload-now-btn"]');
    expect(btn.exists()).toBe(true);

    await btn.trigger('click');
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('modal açıkken doğru metin ve geri sayım bilgisini render etmelidir', async () => {
    const { triggerUpdate, countdown } = useVersionCheck();

    const wrapper = mount(UpdateNotificationModal, {
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    triggerUpdate('new-build-render-test');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Yeni Sürüm Yayınlandı');
    expect(wrapper.text()).toContain('sayfa güncelleniyor (20s)');
    expect(wrapper.text()).toContain('Şimdi Yenile');

    // 3 saniye sonra geri sayım güncellenmeli
    vi.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(countdown.value).toBe(17);
    expect(wrapper.text()).toContain('17 saniye');
  });
});
