import { describe, it, expect, vi, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import AboutModal from '../components/modals/AboutModal.vue';
import HakkimizdaPage from '../pages/hakkimizda.vue';

beforeAll(() => {
  (globalThis as any).useHead = vi.fn();
});

describe('TALEP-025: Canlı Sürüm Bilgilerinde Altyapı ve Veritabanı Bilgilerinin Gizlenmesi', () => {
  it('TC-SURUM-01: AboutModal sürüm sekmesinde dahili altyapı çatısı ve veritabanı motoru bilgisi bulunmamalıdır', async () => {
    const wrapper = mount(AboutModal, {
      props: {
        isOpen: true,
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

    // Canlı Sürüm sekmesine tıkla
    const buttons = wrapper.findAll('button');
    const surumTab = buttons.find((b) => b.text().includes('Canlı Sürüm'));
    expect(surumTab).toBeDefined();
    await surumTab!.trigger('click');

    const text = wrapper.text();

    // Genel sürüm ve durum bilgileri korunmalı
    expect(text).toContain('Platform Sürümü (SemVer)');
    expect(text).toContain('v1.0.0-faz1');
    expect(text).toContain('Yayın Tarihi');

    // Dahili teknoloji ve veritabanı motor detayları açıkça listelenmemelidir (TALEP-025)
    expect(text).not.toContain('Frontend Çatısı');
    expect(text).not.toContain('Backend Çatısı');
    expect(text).not.toContain('Node.js 22 / Fastify');
    expect(text).not.toContain('Veritabanı & Mekânsal Motor');
    expect(text).not.toContain('PostgreSQL 16 + PostGIS 3.4');
  });

  it('TC-SURUM-02: Hakkımızda sayfası canlı sürüm bölümünde teknoloji yığını ve veritabanı bilgileri listelenmemelidir', () => {
    const wrapper = mount(HakkimizdaPage, {
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

    // Genel sürüm ve yayın bilgileri bulunmalı
    expect(text).toContain('Canlı Sürüm Bilgileri');
    expect(text).toContain('Platform Sürümü:');
    expect(text).toContain('v1.0.0-faz1');
    expect(text).toContain('Yayın Tarihi:');

    // Hassas teknoloji ve altyapı detayları yer almamalıdır (TALEP-025)
    expect(text).not.toContain('Teknoloji Yığını');
    expect(text).not.toContain('Fastify Node.js');
    expect(text).not.toContain('PostgreSQL 16 + PostGIS 3.4');
    expect(text).not.toContain('teknik altyapı ve mimari');
  });
});
