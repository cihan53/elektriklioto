
/**
 * Türkçe karakter katlama ve Unicode NFC normalizasyonu yardımcı fonksiyonları.
 * 'ŞRJ/' öneki ve Türkçeye özgü karakterler URL slug ve kanonik kimlik üretiminde
 * tek merkezden işlenir.
 */

export function normalizeNFC(text: string): string {
  return (text || '').normalize('NFC');
}

export function foldTurkishCharacters(text: string): string {
  const normalized = normalizeNFC(text);
  return normalized
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c');
}

export function toSlug(text: string): string {
  if (!text) return '';
  return foldTurkishCharacters(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateStationSlug(
  operatorSlug: string,
  city: string | null | undefined,
  district: string | null | undefined,
  istasyonNo: string
): string {
  const cleanNo = toSlug(istasyonNo.replace(/^ŞRJ\//i, 'srj-'));
  const cleanCity = city ? toSlug(city) : 'turkiye';
  const cleanDistrict = district ? toSlug(district) : '';
  const cleanOperator = operatorSlug ? toSlug(operatorSlug) : 'operator';

  const parts = [cleanOperator, cleanCity, cleanDistrict, cleanNo].filter(Boolean);
  return parts.join('-');
}
