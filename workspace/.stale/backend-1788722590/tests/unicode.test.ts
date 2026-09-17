
import { describe, it, expect } from 'vitest';
import { normalizeNfc, turkishSlugify, normalizeStationCode } from '../src/utils/unicode.js';

describe('Unicode ve Türkçe Karakter Katlama Testleri', () => {
  it('NFC normalizasyonu ile harfleri ayrık formdan tekil forma çevirmelidir', () => {
    // Ş (S + combining cedilla) -> Ş
    const decomposed = 'S\u0327RJ/1042';
    const normalized = normalizeNfc(decomposed);
    expect(normalized).toBe('ŞRJ/1042');
  });

  it('Türkçe harfleri doğru katlayarak temiz URL slug üretmelidir', () => {
    const title = 'ZES - Kadıköy Tepe Nautilus Hızlı Şarj İstasyonu / 1042';
    const slug = turkishSlugify(title);
    expect(slug).toBe('zes-kadikoy-tepe-nautilus-hizli-sarj-istasyonu-1042');
  });

  it('Büyük İ harfini i olarak katlamalıdır', () => {
    const text = 'İSTANBUL ŞARJ';
    expect(turkishSlugify(text)).toBe('istanbul-sarj');
  });

  it('Büyük I harfini i olarak katlamalıdır', () => {
    const text = 'Isparta Ilgaz';
    expect(turkishSlugify(text)).toBe('isparta-ilgaz');
  });

  it('İstasyon kodlarını kanonik ŞRJ/xxxx formatına normalize etmelidir', () => {
    expect(normalizeStationCode('srj/1042')).toBe('ŞRJ/1042');
    expect(normalizeStationCode('ŞRJ-1042')).toBe('ŞRJ/1042');
    expect(normalizeStationCode('1042')).toBe('ŞRJ/1042');
    expect(normalizeStationCode('ŞRJ/9999')).toBe('ŞRJ/9999');
  });
});
