
/**
 * Türkçe karakter katlama ve Unicode NFC normalizasyonu.
 * EPDK 'ŞRJ/' ve Türkçe harfleri standartlaştırır.
 */
export function normalizeNfc(text: string): string {
  if (!text) return '';
  return text.normalize('NFC');
}

export function foldTurkishCharacters(text: string): string {
  if (!text) return '';
  const normalized = normalizeNfc(text);
  const charMap: Record<string, string> = {
    İ: 'i',
    I: 'i',
    ı: 'i',
    Ş: 's',
    ş: 's',
    Ğ: 'g',
    ğ: 'g',
    Ü: 'u',
    ü: 'u',
    Ö: 'o',
    ö: 'o',
    Ç: 'c',
    ç: 'c',
  };

  return normalized
    .replace(/[İIıŞşĞğÜüÖöÇç]/g, (char) => charMap[char] || char)
    .toLowerCase();
}

export function toSlug(text: string): string {
  if (!text) return '';
  const folded = foldTurkishCharacters(text);
  return folded
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
