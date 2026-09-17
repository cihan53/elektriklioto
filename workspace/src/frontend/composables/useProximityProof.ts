
/**
 * Zero-Storage Proximity Proof ve Cihaz Tasdiki (KURAL-AUTH-02)
 *
 * KVKK ve Konum Gizliliği Kuralı:
 * Kullanıcı koordinatları sunucuya ASLA gönderilmez. İstemci cihaz donanım/lokal
 * GPS mesafesini in-memory doğrular (<= 50m) ve tek kullanımlık HMAC belirteci üretir.
 */

export const useProximityProof = () => {
  const config = useRuntimeConfig();
  const secretKey =
    (config.public as any)?.proximitySecret ||
    'elektriklioto-proximity-secret-key-32b!';

  /**
   * Anonim Cihaz Tasdiki (X-Device-Attestation):
   * Kullanıcı profili oluşturulmaz; cihaz yerelinde rastgele üretilmiş belirteç saklanır.
   */
  const getDeviceAttestation = (): string => {
    if (typeof window === 'undefined') {
      return 'web-device-client-default';
    }

    try {
      let deviceUid = localStorage.getItem('elektriklioto_device_uid');
      if (!deviceUid || deviceUid.trim().length < 8) {
        const randomBytes = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) {
          window.crypto.getRandomValues(randomBytes);
        } else {
          for (let i = 0; i < 16; i++) {
            randomBytes[i] = Math.floor(Math.random() * 256);
          }
        }
        const hex = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        deviceUid = `web-attest-${hex}`;
        localStorage.setItem('elektriklioto_device_uid', deviceUid);
      }
      return deviceUid;
    } catch {
      return 'web-attest-fallback-device-token';
    }
  };

  /**
   * Rastgele 16 baytlık tek kullanımlık dize (nonce) üretir (32 hex karakter).
   */
  const generateNonce = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  };

  /**
   * Kriptografik HMAC-SHA256 proximity proof üretir.
   * Format: `${stationId}${deviceUid}${T}${nonce}` (T = round(epoch / 60000))
   */
  const generateProof = async (
    stationId: string,
    deviceUid: string,
    nonce: string,
    epoch: number = Date.now()
  ): Promise<string> => {
    const T = Math.round(epoch / 60000);
    const data = `${stationId}${deviceUid}${T}${nonce}`;

    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await window.crypto.subtle.sign('HMAC', key, encoder.encode(data));
      return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      const { createHmac } = await import('node:crypto');
      return createHmac('sha256', secretKey).update(data).digest('hex');
    }
  };

  return {
    getDeviceAttestation,
    generateNonce,
    generateProof,
  };
};
