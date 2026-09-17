
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../../config/env.js';

export interface VerifyProximityOptions {
  stationId: string;
  deviceUid: string;
  nonce: string;
  proof: string;
  customSecret?: string;
  epoch?: number;
}

export interface VerifyResult {
  valid: boolean;
  reason?: 'NONCE_REPLAY' | 'INVALID_PROOF' | 'INVALID_NONCE_FORMAT';
}

export class ProximityProofService {
  private secret: string;
  private usedNonces = new Map<string, number>();

  constructor(secret = config.proximitySecret) {
    this.secret = secret;
  }

  /**
   * İstemci tarafından üretilen tek kullanımlık Proximity Proof HMAC belirtecini doğrular.
   * Tolerans: Zaman penceresi T ± 1 dakika (toplam 3 pencere).
   * Replay koruması: Kullanılmış nonce değerleri 5 dakika saklanır.
   */
  public verify(options: VerifyProximityOptions): VerifyResult {
    const { stationId, deviceUid, nonce, proof, customSecret, epoch = Date.now() } = options;
    const effectiveSecret = customSecret || this.secret;

    if (!nonce || nonce.length < 16) {
      return { valid: false, reason: 'INVALID_NONCE_FORMAT' };
    }

    // Replay Attack Kontrolü
    const now = Date.now();
    this.cleanupExpiredNonces(now);

    const existingExpire = this.usedNonces.get(nonce);
    if (existingExpire && existingExpire > now) {
      return { valid: false, reason: 'NONCE_REPLAY' };
    }

    const proofBuffer = Buffer.from(proof.toLowerCase(), 'hex');
    if (proofBuffer.length !== 32) {
      return { valid: false, reason: 'INVALID_PROOF' };
    }

    // T = round(epoch / 60000)
    const T = Math.round(epoch / 60000);
    const candidateWindows = [T, T - 1, T + 1];

    let matched = false;

    for (const window of candidateWindows) {
      const candidates = [
        `${stationId}${deviceUid}${window}${nonce}`,
        `${stationId}:${deviceUid}:${window}:${nonce}`,
      ];

      for (const candidate of candidates) {
        const expectedHmacHex = createHmac('sha256', effectiveSecret)
          .update(candidate)
          .digest('hex');
        const expectedBuffer = Buffer.from(expectedHmacHex, 'hex');

        if (proofBuffer.length === expectedBuffer.length && timingSafeEqual(proofBuffer, expectedBuffer)) {
          matched = true;
          break;
        }
      }

      if (matched) break;
    }

    if (!matched) {
      return { valid: false, reason: 'INVALID_PROOF' };
    }

    // Başarılı doğrulama: Nonce'u 5 dakikalık TTL ile önbelleğe al
    this.usedNonces.set(nonce, now + 5 * 60 * 1000);
    return { valid: true };
  }

  /**
   * İstemci veya testler için geçerli Proximity Proof HMAC üretir.
   */
  public generateProof(
    stationId: string,
    deviceUid: string,
    nonce: string,
    secret = this.secret,
    epoch = Date.now(),
    format: 'concat' | 'colon' = 'concat'
  ): string {
    const T = Math.round(epoch / 60000);
    const data = format === 'colon'
      ? `${stationId}:${deviceUid}:${T}:${nonce}`
      : `${stationId}${deviceUid}${T}${nonce}`;
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  public clearNonces(): void {
    this.usedNonces.clear();
  }

  private cleanupExpiredNonces(now: number): void {
    if (this.usedNonces.size > 5000) {
      for (const [nonce, expireAt] of this.usedNonces.entries()) {
        if (expireAt <= now) {
          this.usedNonces.delete(nonce);
        }
      }
    }
  }
}

export const proximityProofService = new ProximityProofService();
