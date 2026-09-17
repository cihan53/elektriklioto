
// SAPMA: Paket seçim raporunda 'undici' kütüphanesi önerilmiştir; ancak boru hattı / CI ortamında harici 'undici' paketi bulunmadığından ve TS2307 derleme hatası verdiğinden, Node.js 22 ile yerleşik gelen global fetch / web standartları API'si kullanılmıştır.
import { circuitBreakerService, BrokenCircuitError } from './circuit-breaker.service.js';
import { config } from '../../config/env.js';

export interface HttpClientOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  skipJitter?: boolean;
  minJitterMs?: number;
  maxJitterMs?: number;
}

export interface HttpResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  data: T;
}

/**
 * Saygılı Kazıma ve Dış HTTP İstemcisi
 * 
 * - 5000ms soket zaman aşımı
 * - 500ms - 2000ms rastgele gecikme (jitter)
 * - Circuit Breaker koruması (429 ve 5xx hatalarında tetiklenir)
 */
export class AggregatorHttpClient {
  private timeoutMs: number;

  constructor(timeoutMs = config.httpTimeoutMs || 5000) {
    this.timeoutMs = timeoutMs;
  }

  public calculateJitter(minMs = 500, maxMs = 2000): number {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  }

  public async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async fetchWithCircuitBreaker<T = unknown>(
    sourceKey: string,
    url: string,
    options?: HttpClientOptions
  ): Promise<HttpResponse<T>> {
    // 1. Jitter gecikmesi (Saygılı kazıma kuralı)
    if (!options?.skipJitter && process.env.NODE_ENV !== 'test') {
      const jitterMs = this.calculateJitter(options?.minJitterMs, options?.maxJitterMs);
      await this.sleep(jitterMs);
    }

    // 2. Circuit Breaker sarmalaması
    return circuitBreakerService.execute(sourceKey, async () => {
      const timeout = options?.timeoutMs ?? this.timeoutMs;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'elektriklioto-aggregator/1.0.0 (https://elektriklioto.com; info@elektriklioto.com)',
            'Accept': 'application/json',
            ...(options?.headers || {}),
          },
        });

        const statusCode = response.status;

        // HTTP 429 veya 5xx Circuit Breaker için hata sayılır
        if (statusCode === 429 || statusCode >= 500) {
          throw new Error(`Dış CPO uç noktası hata döndü: HTTP ${statusCode}`);
        }

        const headers: Record<string, string | string[] | undefined> = {};
        response.headers.forEach((val, key) => {
          headers[key.toLowerCase()] = val;
        });

        let data: any;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        return {
          statusCode,
          headers,
          data,
        };
      } finally {
        clearTimeout(timer);
      }
    });
  }
}

export { BrokenCircuitError };
export const aggregatorHttpClient = new AggregatorHttpClient();
