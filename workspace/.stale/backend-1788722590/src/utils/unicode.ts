
/**
 * Unicode NFC Normalizasyonu ve Türkçe Karakter Katlama Yardımcıları
 * 
 * ŞRJ/ öneki ve Türkçe karakterlerin (İ, I, ş, ğ, ç, ö, ü)
 * indeksleme, eşleme ve slug üretiminde bozulmasını engeller.
 */

export function normalizeNfc(text: string): string {
  if (!text) return '';
  return text.normalize('NFC');
}

/**
 * Türkçe duyarlı küçük harfe dönüştürme ve URL slug üretimi
 * İ -> i, I -> ı -> i kuralı uygulanır.
 */
export function turkishSlugify(text: string): string {
  if (!text) return '';

  const normalized = normalizeNfc(text).trim();

  // Türkçe harf dönüşüm haritası
  const turkishCharMap: Record<string, string> = {
    'İ': 'i',
    'I': 'i',
    'ı': 'i',
    'ş': 's',
    'Ş': 's',
    'ğ': 'g',
    'Ğ': 'g',
    'ü': 'u',
    'Ü': 'u',
    'ö': 'o',
    'Ö': 'o',
    'ç': 'c',
    'Ç': 'c',
    '/': '-',
    '\\': '-',
    '_': '-',
    '.': '-',
  };

  let result = '';
  for (const char of normalized) {
    if (turkishCharMap[char] !== undefined) {
      result += turkishCharMap[char];
    } else {
      result += char.toLowerCase();
    }
  }

  return result
    .replace(/[^a-z0-9-]/g, '-') // Alfanumerik ve tire dışındakileri tireye çevir
    .replace(/-+/g, '-')         // Peş peşe gelen tireleri tekilleştir
    .replace(/^-|-$/g, '');      // Baş ve sondaki tireleri temizle
}

/**
 * İstasyon kodunu kanonik formata normalize eder (Örn: 'srj/1042' -> 'ŞRJ/1042')
 */
export function normalizeStationCode(code: string): string {
  if (!code) return '';
  const trimmed = normalizeNfc(code).trim();
  
  // 'SRJ-1042', 'srj/1042', 'şrj/1042' gibi varyasyonları kanonik 'ŞRJ/xxxx' yapar
  const match = trimmed.match(/^(?:şrj|srj|şrj\/|srj\/|şrj-|srj-)?\/?(\d+)$/i);
  if (match && match[1]) {
    return `ŞRJ/${match[1]}`;
  }

  return trimmed;
}
