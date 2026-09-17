
import { aggregatorHttpClient, BrokenCircuitError } from './http-client.js';
import { circuitBreakerService } from './circuit-breaker.service.js';
import { sourceHealthService } from './source-health.service.js';
import { stationRepository } from '../stations/station.service.js';

export interface CPOSyncResult {
  source: string;
  operatorId: number;
  syncedCount: number;
  updatedAt: Date;
  circuitState: string;
}

/**
 * CPO Veri Senkronizasyon Servisi (US-17)
 * 
 * Circuit Breaker ve HTTP İstemcisi üzerinden dış CPO uç noktalarından
 * istasyon durum verilerini çeker ve istasyonların updated_at zaman damgasını günceller.
 */
export class CPOSyncService {
  public async syncOperator(
    operatorId: number,
    sourceName: string,
    endpointUrl: string,
    mockDataFetcher?: () => Promise<any>
  ): Promise<CPOSyncResult> {
    const now = new Date();

    try {
      let data: any;

      if (mockDataFetcher) {
        data = await circuitBreakerService.execute(sourceName, mockDataFetcher);
      } else {
        const response = await aggregatorHttpClient.fetchWithCircuitBreaker(sourceName, endpointUrl);
        data = response.data;
      }

      let updatedCount = 0;
      for (const s of stationRepository.stations.values()) {
        if (s.operator_id === operatorId) {
          s.updated_at = now;
          updatedCount += 1;
        }
      }

      sourceHealthService.recordSuccess(sourceName);

      return {
        source: sourceName,
        operatorId,
        syncedCount: updatedCount,
        updatedAt: now,
        circuitState: circuitBreakerService.getState(sourceName),
      };
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      sourceHealthService.recordFailure(sourceName, errorMsg);

      if (err instanceof BrokenCircuitError) {
        throw new Error(`[Circuit Breaker OPEN] ${sourceName} kaynağı soğumaya alındı. İstek engellendi.`);
      }

      throw err;
    }
  }
}

export const cpoSyncService = new CPOSyncService();
