
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../../config/env.js';
import { RoutePayload } from '../../types/route-bridge.js';
import { BadRequestError } from '../../utils/errors.js';

export class RouteBridgeService {
  private secret = config.routeBridgeSecret;

  public encodeRoute(stops: string[], expiresInHours = 48): { code: string; url: string; expiresAt: string } {
    const safeHours = Math.min(Math.max(1, expiresInHours), 48);
    const expiresAt = Date.now() + safeHours * 60 * 60 * 1000;

    const payload: RoutePayload = {
      version: 1,
      stops,
      expires_at: expiresAt,
    };

    const dataToSign = `${payload.version}:${payload.stops.join(',')}:${payload.expires_at}`;
    const sig = createHmac('sha256', this.secret).update(dataToSign).digest('hex').substring(0, 16);
    payload.sig = sig;

    const jsonStr = JSON.stringify(payload);
    const code = Buffer.from(jsonStr, 'utf-8').toString('base64url');
    const url = `https://elektriklioto.com/r/${code}`;

    return {
      code,
      url,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  public decodeRoute(code: string): RoutePayload {
    let rawJson: string;
    try {
      rawJson = Buffer.from(code, 'base64url').toString('utf-8');
    } catch {
      throw new BadRequestError('Geçersiz rota formatı (Base64 decode hatası).');
    }

    let payload: RoutePayload;
    try {
      payload = JSON.parse(rawJson);
    } catch {
      throw new BadRequestError('Geçersiz rota verisi (JSON parse hatası).');
    }

    if (!payload.version || !payload.stops || !payload.expires_at || !payload.sig) {
      throw new BadRequestError('Eksik rota parametreleri.');
    }

    if (Date.now() > payload.expires_at) {
      throw new BadRequestError('Rota aktarım süresi dolmuş (48 saat aşıldı).');
    }

    const dataToSign = `${payload.version}:${payload.stops.join(',')}:${payload.expires_at}`;
    const expectedSig = createHmac('sha256', this.secret).update(dataToSign).digest('hex').substring(0, 16);

    const sigBuf = Buffer.from(payload.sig);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      throw new BadRequestError('Rota imzası geçersiz. Veri tahrif edilmiş olabilir.');
    }

    return payload;
  }
}

export const routeBridgeService = new RouteBridgeService();
