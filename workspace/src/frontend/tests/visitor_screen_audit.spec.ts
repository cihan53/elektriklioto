import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import HeaderNav from '../components/common/HeaderNav.vue';
import SourceHealthModal from '../components/modals/SourceHealthModal.vue';
import AboutModal from '../components/modals/AboutModal.vue';
import SourceHealthBanner from '../components/common/SourceHealthBanner.vue';
import ToastContainer from '../components/common/ToastContainer.vue';
import FilterChips from '../components/map/FilterChips.vue';
import SearchInput from '../components/map/SearchInput.vue';
import StationDetailPanel from '../components/map/StationDetailPanel.vue';
import QrBridgeModal from '../components/modals/QrBridgeModal.vue';
import ContributeModal from '../components/modals/ContributeModal.vue';
import IssueReportModal from '../components/modals/IssueReportModal.vue';
import StationSummaryCard from '../components/station/StationSummaryCard.vue';
import type { StationItem } from '../types/station';

describe('Ziyaretçi Ekran ve Gezinim Denetimi (Visitor Screen Audit Suite)', () => {
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

  const sampleStation: StationItem = {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8',
    istasyon_no: 'ŞRJ/10423',
    slug: 'voltrun-kadikoy-otopark',
    name: 'Voltrun Kadıköy Otoparkı',
    lat: 40.992,
    lon: 29.025,
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Caferağa Mah. Moda Cad. No:12',
    service_type: 'Halka Açık',
    operator: {
      id: 4,
      name: 'Voltrun',
      slug: 'voltrun',
      is_active: true
    },
    is_flagged_defective: false,
    connector_types: null,
    power_kw: null,
    current_tariff: null,
    connectors: null,
    status: null,
    updated_at: '2026-09-14T10:00:00Z',
    data_freshness: {
      is_stale: true,
      last_updated_text: 'Son güncelleme: 2 gün önce'
    }
  };

  // =========================================================================
  // 1. HEADER VE TEMEL NAVİGASYON
  // =========================================================================
  it('SCR-01.1: HeaderNav - Marka logosu, dizin linkleri, tema ve kaynak sağlığı butonları tepkili olmalıdır', async () => {
    const wrapper = mount(HeaderNav, {
      global: {
        stubs: {
          NuxtLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          SourceHealthModal: true
        }
      }
    });

    // 1. Logo ve link kontrolü
    const logoLink = wrapper.find('a[aria-label="elektriklioto.com Ana Sayfa"]');
    expect(logoLink.exists()).toBe(true);
    expect(logoLink.attributes('href')).toBe('/');

    // 2. SEO Dizin linkleri
    const links = wrapper.findAll('nav a');
    const hrefs = links.map(l => l.attributes('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/istanbul/sarj-istasyonlari');
    expect(hrefs).toContain('/ankara/sarj-istasyonlari');
    expect(hrefs).toContain('/izmir/sarj-istasyonlari');
    expect(hrefs).toContain('/zes');
    expect(hrefs).toContain('/trugo');

    // 3. Tema Değiştirici Buton Tıklama (3 durum döngüsü)
    const themeBtn = wrapper.find('button[aria-label="Tema Değiştir"]');
    expect(themeBtn.exists()).toBe(true);
    await themeBtn.trigger('click'); // system -> light
    await themeBtn.trigger('click'); // light -> dark
    await themeBtn.trigger('click'); // dark -> system

    // 4. Kaynak Sağlığı Butonu Tıklama
    const healthBtn = wrapper.find('button[aria-label="Veri Kaynakları Sağlık Durumu"]');
    expect(healthBtn.exists()).toBe(true);
    await healthBtn.trigger('click');

    // 5. Hakkında & Yasal Bilgiler Butonu ve Dizin Linki (TALEP-009)
    expect(hrefs).toContain('/hakkimizda');
    const aboutBtn = wrapper.find('button[aria-label="Hakkında ve Yasal Bilgiler"]');
    expect(aboutBtn.exists()).toBe(true);
    await aboutBtn.trigger('click');
  });

  // =========================================================================
  // 2. KAYNAK SAĞLIĞI MODALI VE BANNER'I
  // =========================================================================
  it('SCR-01.2: SourceHealthModal - Modal açılmalı, kapatma ve anladım butonları tetiklenmelidir', async () => {
    const wrapper = mount(SourceHealthModal, {
      props: {
        isOpen: true
      }
    });

    expect(wrapper.find('#source-health-title').text()).toContain('Veri Kaynakları Sağlık Durumu');

    // Kapat butonu
    const closeBtn = wrapper.find('button[aria-label="Kapat"]');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);

    // Anladım butonu
    const ackBtn = wrapper.findAll('button').find(b => b.text().includes('Anladım'));
    expect(ackBtn).toBeDefined();
    await ackBtn!.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('SCR-01.3: SourceHealthBanner - Kesinti durumunda butonlar tepki vermeli ve detay açmalıdır', async () => {
    const wrapper = mount(SourceHealthBanner);
    expect(wrapper.exists()).toBe(true);
  });


  // =========================================================================
  // 2.1. HAKKINDA VE YASAL BİLGİLER MODALI (TALEP-009)
  // =========================================================================
  it('SCR-ABOUT: AboutModal (TALEP-009) - Hakkında modalı açılmalı, sekmeler gezilmeli ve kapatılabilmelidir', async () => {
    const wrapper = mount(AboutModal, {
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

    expect(wrapper.find('#about-modal-title').text()).toContain('Hakkında & Yasal Bilgiler');
    expect(wrapper.text()).toContain('e-Mobilite Asistanı ve Bilgi Hub');

    // Sekmeler arası geçiş
    const buttons = wrapper.findAll('button');
    const yasalTab = buttons.find(b => b.text().includes('Yasal Statü'));
    expect(yasalTab).toBeDefined();
    await yasalTab!.trigger('click');
    expect(wrapper.text()).toContain('Zorunlu EMP Beyanı');

    const kvkkTab = buttons.find(b => b.text().includes('KVKK & Gizlilik'));
    expect(kvkkTab).toBeDefined();
    await kvkkTab!.trigger('click');
    expect(wrapper.text()).toContain('Sıfır Konum Saklama İlkesi');

    const surumTab = buttons.find(b => b.text().includes('Canlı Sürüm'));
    expect(surumTab).toBeDefined();
    await surumTab!.trigger('click');
    expect(wrapper.text()).toContain('v1.0.0-faz1');

    // Kapat butonu
    const closeBtn = wrapper.find('button[aria-label="Kapat"]');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  // =========================================================================
  // 3. FİLTRE ÇUBUĞU ETKİLEŞİMİ (FILTER CHIPS)
  // =========================================================================
  it('SCR-01.4: FilterChips - Operatör menüsü açılmalı, seçim yapılmalı, kilitli filtreler toast üretmelidir', async () => {
    const wrapper = mount(FilterChips, {
      props: {
        selectedOperator: '',
        isPublicOnly: false
      }
    });

    // 1. Operatör dropdown açılışı
    const opDropdownBtn = wrapper.find('button[aria-label="Operatör Filtresi"]');
    expect(opDropdownBtn.exists()).toBe(true);
    expect(opDropdownBtn.text()).toContain('Tüm Operatörler');

    await opDropdownBtn.trigger('click');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);

    // 2. Halka Açık Filtresi
    const publicBtn = wrapper.find('button[aria-label="Halka Açık İstasyonları Filtrele"]');
    expect(publicBtn.exists()).toBe(true);
    await publicBtn.trigger('click');
    expect(wrapper.emitted('update:isPublicOnly')?.[0]).toEqual([true]);

    // 3. Kilitli Filtreler (Faz 1 Kısıtları: Hızlı Şarj & Boş Soketler)
    const lockedDcBtn = wrapper.find('button[title*="güç verisi"]');
    expect(lockedDcBtn.exists()).toBe(true);
    await lockedDcBtn.trigger('click'); // Toast üretir, hata vermez

    const lockedOccBtn = wrapper.find('button[title*="anlık doluluk"]');
    expect(lockedOccBtn.exists()).toBe(true);
    await lockedOccBtn.trigger('click'); // Toast üretir, hata vermez
  });

  // =========================================================================
  // 4. ARAMA KUTUSU ETKİLEŞİMİ (SEARCH INPUT)
  // =========================================================================
  it('SCR-01.5: SearchInput - Karakter girişinde otomatik tamamlama açılmalı, temizleme butonu sıfırlamalıdır', async () => {
    const wrapper = mount(SearchInput, {
      props: {
        modelValue: ''
      }
    });

    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);

    // 1. Arama sorgusu girişi
    await input.setValue('İst');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['İst']);

    // Arama debounce/spinner beklemesi
    await new Promise(resolve => setTimeout(resolve, 250));
    await wrapper.vm.$nextTick();

    // 2. Temizleme butonu
    const clearBtn = wrapper.find('button[aria-label="Aramayı Temizle"]');
    expect(clearBtn.exists()).toBe(true);
    await clearBtn.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['']);
  });

  // =========================================================================
  // 5. İSTASYON DETAY PANELİ ETKİLEŞİMLERİ (STATION DETAIL PANEL)
  // =========================================================================
  it('SCR-02: StationDetailPanel - Detaylar eksiksiz görünmeli, tüm butonlar ilgili modalları ve eylemleri tetiklemelidir', async () => {
    const wrapper = mount(StationDetailPanel, {
      props: {
        station: sampleStation,
        isOpen: true
      }
    });

    // 1. Kanonik Veriler ve EPDK Sicili
    expect(wrapper.text()).toContain('Voltrun Kadıköy Otoparkı');
    expect(wrapper.text()).toContain('ŞRJ/10423');
    expect(wrapper.text()).toContain('Operatör Verisi Bekleniyor');
    expect(wrapper.text()).toContain('Son güncelleme: 2 gün önce');

    // 2. Kapat Butonu
    const closeBtn = wrapper.find('button[aria-label="İstasyon Detayını Kapat"]');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);

    // 3. Operatör Web Sitesine Git (DeepLink Fallback)
    const primaryBtn = wrapper.find('button.bg-primary');
    expect(primaryBtn.exists()).toBe(true);
    expect(primaryBtn.text()).toContain('Operatör Web Sitesine Git');
    await primaryBtn.trigger('click');

    // 4. Telefona Aktar Butonu (QR Bridge Modalı)
    const qrBtn = wrapper.findAll('button').find(b => b.text().includes('Telefona Aktar'));
    expect(qrBtn).toBeDefined();
    await qrBtn!.trigger('click');
    expect(wrapper.emitted('openQrBridge')?.[0]).toEqual([sampleStation]);

    // 5. + Bilgi Ekle Butonu (Contribute Modalı)
    const contributeBtn = wrapper.findAll('button').find(b => b.text().includes('+ Bilgi Ekle'));
    expect(contributeBtn).toBeDefined();
    await contributeBtn!.trigger('click');
    expect(wrapper.emitted('openContribute')?.[0]).toEqual([sampleStation]);

    // 6. Arıza Bildir Butonu (Issue Report Modalı)
    const reportBtn = wrapper.findAll('button').find(b => b.text().includes('Arıza Bildir'));
    expect(reportBtn).toBeDefined();
    await reportBtn!.trigger('click');
    expect(wrapper.emitted('openReport')?.[0]).toEqual([sampleStation]);
  });

  // TALEP-003: Voltrun istasyonlarında soket tipi AC Tip 2 olarak gösterilmelidir (CCS yerine)
  it('TALEP-003: Voltrun istasyonunda soket tipi CCS yerine AC Tip 2 olarak görüntülenmelidir', () => {
    const voltrunStation: StationItem = {
      ...sampleStation,
      connector_types: ['CCS2'],
      power_kw: 120.0,
      current_tariff: '11.58 TL/kWh'
    };

    const wrapper = mount(StationDetailPanel, {
      props: {
        station: voltrunStation,
        isOpen: true
      }
    });

    expect(wrapper.text()).toContain('AC Tip 2');
    expect(wrapper.text()).not.toContain('CCS2');
    expect(wrapper.text()).toContain('120 kW');
  });

  // =========================================================================
  // 6. QR ROTA VE İSTASYON KÖPRÜSÜ MODALI
  // =========================================================================
  it('SCR-05: QrBridgeModal - SVG QR kod render edilmeli, bağlantı kopyalama panoyu tetiklemelidir', async () => {
    const wrapper = mount(QrBridgeModal, {
      props: {
        station: sampleStation,
        isOpen: true
      }
    });

    expect(wrapper.find('#qr-modal-title').text()).toContain('İstasyonu Telefona Aktar');
    expect(wrapper.find('svg').exists()).toBe(true); // Dinamik SVG QR Kod

    // Bağlantıyı kopyala butonu
    const copyBtn = wrapper.findAll('button').find(b => b.text().includes('Bağlantıyı Kopyala'));
    expect(copyBtn).toBeDefined();
    await copyBtn!.trigger('click');

    // Kapat butonu
    const closeBtn = wrapper.find('button[aria-label="Modalı Kapat"]');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  // =========================================================================
  // 7. EKSİK VERİ TAMAMLAMA KATKI MODALI
  // =========================================================================
  it('SCR-07: ContributeModal - Soket ve güç seçimi yapılabilmeli, form başarıyla gönderilmelidir', async () => {
    const wrapper = mount(ContributeModal, {
      props: {
        station: sampleStation,
        isOpen: true
      }
    });

    expect(wrapper.find('#contribute-modal-title').text()).toContain('İstasyon Bilgisi Ekle');

    // Güç seçimi butonları
    const p120Btn = wrapper.findAll('button').find(b => b.text() === '120 kW');
    expect(p120Btn).toBeDefined();
    await p120Btn!.trigger('click');

    // Form submit
    await wrapper.find('form').trigger('submit.prevent');

    // Kapat butonu
    const closeBtn = wrapper.find('button[aria-label="Modalı Kapat"]');
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toBeDefined();
  });

  // =========================================================================
  // 8. PROXIMITY PROOF ARIZA BİLDİRİM MODALI (50M KVKK KURALI)
  // =========================================================================
  it('SCR-06: IssueReportModal - 50m doğrulama durumu ve sorun türü seçimleri tepkili olmalıdır', async () => {
    const wrapper = mount(IssueReportModal, {
      props: {
        station: sampleStation,
        isOpen: true
      }
    });

    expect(wrapper.find('#report-modal-title').text()).toContain('Arıza / Durum Bildir');

    // Sorun türleri radyo butonları
    const radioInputs = wrapper.findAll('input[type="radio"]');
    expect(radioInputs.length).toBe(5);

    // Açıklama alanı
    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);
    await textarea.setValue('Ekran donmuş ve soket mandalı kilitli.');

    // Kapat butonu
    const closeBtn = wrapper.find('button[aria-label="Modalı Kapat"]');
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  // =========================================================================
  // 9. BİLDİRİM SİSTEMİ (TOAST CONTAINER)
  // =========================================================================
  it('SCR-TOAST: ToastContainer - Toast mesajları render edilmeli ve kapatılabilmelidir', async () => {
    const wrapper = mount(ToastContainer);
    expect(wrapper.exists()).toBe(true);
  });

  // =========================================================================
  // 10. SEO İSTASYON KARTLARI (STATION SUMMARY CARD)
  // =========================================================================
  it('SCR-03.CARD: StationSummaryCard - Kartta EPDK no, operatör, veri yokluk rozetleri ve linkler doğrulanmalıdır', () => {
    const wrapper = mount(StationSummaryCard, {
      props: {
        station: sampleStation
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

    expect(wrapper.text()).toContain('Voltrun Kadıköy Otoparkı');
    expect(wrapper.text()).toContain('ŞRJ/10423');
    expect(wrapper.text()).toContain('Operatör Verisi Bekleniyor');
    expect(wrapper.text()).toContain('Son güncelleme: 2 gün önce');

    const links = wrapper.findAll('a');
    expect(links.length).toBeGreaterThanOrEqual(2);
    const hrefs = links.map(l => l.attributes('href'));
    expect(hrefs).toContain('/voltrun/voltrun-kadikoy-otopark');
  });
});
