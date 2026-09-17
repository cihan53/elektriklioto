
// SAPMA: Paket seçim raporunda 'cockatiel' kütüphanesi önerilmiştir; ancak boru hattı / CI ortamında bu bağımlılık bulunmadığından ve TS2307 derleme hatası verdiğinden, sıfır bağımlılıkla yerel Circuit Breaker sınıfı uygulanmıştır.
import { config } from '../../config/env.js';

export type CircuitStatusString = 'CLOSED' | 'OPEN' | 'HALF_OPEN' | 'ISOLATED';

export enum CircuitState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  HalfOpen = 'HALF_OPEN',
  Isolated = 'ISOLATED',
}

export class BrokenCircuitError extends Error {
  constructor(message = 'Execution prevented because the circuit breaker is open') {
    super(message);
    this.name = 'BrokenCircuitError';
    Object.setPrototypeOf(this, BrokenCircuitError.prototype);
  }
}

export function isBrokenCircuitError(error: unknown): error is BrokenCircuitError {
  return error instanceof BrokenCircuitError || (error instanceof Error && error.name === 'BrokenCircuitError');
}

export interface CircuitBreakerOptions {
  consecutiveFailures?: number;
  halfOpenAfterMs?: number;
}

interface BreakerInternalState {
  state: CircuitStatusString;
  consecutiveFailures: number;
  openedAt: number | null;
  maxFailures: number;
  cooldownMs: number;
}

/**
 * Devre Kesici (Circuit Breaker) Servisi
 * 
 * Dış CPO servislerine yapılacak çağrıları korur.
 * Kural: 5 ardışık HTTP 5xx veya 429 hatasında devre 'OPEN' durumuna geçer
 * ve 15 dakika boyunca soğumaya alınır (yeni dış istek engellenir).
 */
export class CircuitBreakerService {
  private breakers = new Map<string, BreakerInternalState>();
  private defaultFailures: number;
  private defaultCooldownMs: number;

  constructor(
    defaultFailures = config.circuitBreakerFailureThreshold || 5,
    defaultCooldownMs = config.circuitBreakerCooldownMs || 15 * 60 * 1000
  ) {
    this.defaultFailures = defaultFailures;
    this.defaultCooldownMs = defaultCooldownMs;
  }

  private getOrCreate(sourceKey: string, options?: CircuitBreakerOptions): BreakerInternalState {
    let breaker = this.breakers.get(sourceKey);
    if (!breaker) {
      breaker = {
        state: 'CLOSED',
        consecutiveFailures: 0,
        openedAt: null,
        maxFailures: options?.consecutiveFailures ?? this.defaultFailures,
        cooldownMs: options?.halfOpenAfterMs ?? this.defaultCooldownMs,
      };
      this.breakers.set(sourceKey, breaker);
    }
    return breaker;
  }

  public getBreaker(sourceKey: string, options?: CircuitBreakerOptions) {
    const breaker = this.getOrCreate(sourceKey, options);
    return {
      execute: <T>(action: () => Promise<T>): Promise<T> => this.execute(sourceKey, action, options),
      get state(): CircuitState {
        const s = breaker.state;
        if (s === 'OPEN') return CircuitState.Open;
        if (s === 'HALF_OPEN') return CircuitState.HalfOpen;
        if (s === 'ISOLATED') return CircuitState.Isolated;
        return CircuitState.Closed;
      },
    };
  }

  public async execute<T>(
    sourceKey: string,
    action: () => Promise<T>,
    options?: CircuitBreakerOptions
  ): Promise<T> {
    const breaker = this.getOrCreate(sourceKey, options);
    const now = Date.now();

    // Devre AÇIK ise ve soğuma süresi geçtiyse HALF_OPEN'a geçir
    if (breaker.state === 'OPEN') {
      if (breaker.openedAt !== null && now - breaker.openedAt >= breaker.cooldownMs) {
        breaker.state = 'HALF_OPEN';
      } else {
        throw new BrokenCircuitError(
          `[Circuit Breaker OPEN] ${sourceKey} kaynağı soğumada. İstek engellendi.`
        );
      }
    }

    if (breaker.state === 'ISOLATED') {
      throw new BrokenCircuitError(`[Circuit Breaker ISOLATED] ${sourceKey} izole durumda.`);
    }

    try {
      const result = await action();
      // Başarılı çağrı: Devre kapanır ve sayaç sıfırlanır
      breaker.consecutiveFailures = 0;
      breaker.state = 'CLOSED';
      breaker.openedAt = null;
      return result;
    } catch (err) {
      breaker.consecutiveFailures += 1;
      if (breaker.state === 'HALF_OPEN' || breaker.consecutiveFailures >= breaker.maxFailures) {
        breaker.state = 'OPEN';
        breaker.openedAt = Date.now();
      }
      throw err;
    }
  }

  public getState(sourceKey: string): CircuitStatusString {
    const breaker = this.breakers.get(sourceKey);
    if (!breaker) return 'CLOSED';

    if (breaker.state === 'OPEN' && breaker.openedAt !== null) {
      if (Date.now() - breaker.openedAt >= breaker.cooldownMs) {
        breaker.state = 'HALF_OPEN';
      }
    }

    return breaker.state;
  }

  public isCircuitOpen(sourceKey: string): boolean {
    return this.getState(sourceKey) === 'OPEN';
  }

  public reset(sourceKey: string): void {
    this.breakers.delete(sourceKey);
  }

  public clearAll(): void {
    this.breakers.clear();
  }
}

export const circuitBreakerService = new CircuitBreakerService();
