
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { sourceHealthService } from '../worker/source-health.service.js';
import { skipLockedQueue } from '../queue/skip-locked-queue.js';
import { cpoSyncService } from '../worker/cpo-sync.service.js';
import { circuitBreakerService } from '../worker/circuit-breaker.service.js';
import { CPO_ENDPOINTS } from '../worker/cpo-endpoints.js';
import {
  SourcesHealthResponseSchema,
  QueueStatsResponseSchema,
  CPOEndpointsResponseSchema,
  SyncTriggerRequestSchema,
  SyncTriggerResponseSchema,
  CronTriggerResponseSchema,
} from './health.schema.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // CPO Veri Kaynakları Sağlık Durumu ve Tazelik Raporu (US-18)
  app.get(
    '/sources',
    {
      schema: {
        description: 'CPO veri kaynaklarının sağlık durumunu, Circuit Breaker durumunu ve tazelik metriklerini listeler.',
        tags: ['Health'],
        response: {
          200: SourcesHealthResponseSchema,
        },
      },
    },
    async () => {
      const sources = sourceHealthService.getAllSources();
      const staleSources = sourceHealthService.getStaleSources(24);
      const healthySources = sources.filter((s) => s.is_healthy).length;

      return {
        status: 'UP',
        total_sources: sources.length,
        healthy_sources: healthySources,
        stale_sources: staleSources.length,
        sources: sources.map((s) => ({
          ...s,
          last_successful_sync: s.last_successful_sync ? s.last_successful_sync.toISOString() : null,
          last_attempt_at: s.last_attempt_at ? s.last_attempt_at.toISOString() : null,
        })),
      };
    }
  );

  // PostgreSQL SKIP LOCKED İş Kuyruğu Durumu (US-16)
  app.get(
    '/queue',
    {
      schema: {
        description: 'PostgreSQL SKIP LOCKED asenkron iş kuyruğu metriklerini döner.',
        tags: ['Health'],
        response: {
          200: QueueStatsResponseSchema,
        },
      },
    },
    async () => {
      return skipLockedQueue.getStats();
    }
  );

  // Tespit Edilmiş Açık CPO ve EPDK Endpoint Kataloğu (TALEP-015)
  app.get(
    '/endpoints',
    {
      schema: {
        description: 'EPDK ve tüm lisanslı CPO açık servis ve kamusal endpoint adreslerini listeler.',
        tags: ['Health'],
        response: {
          200: CPOEndpointsResponseSchema,
        },
      },
    },
    async () => {
      const allSources = sourceHealthService.getAllSources();
      const sourcesMap = new Map(allSources.map((s) => [s.source_name, s]));

      const endpoints = CPO_ENDPOINTS.map((ep) => {
        const sh = sourcesMap.get(ep.sourceName);
        return {
          id: ep.id,
          operator_id: ep.operatorId,
          operator_slug: ep.operatorSlug,
          source_name: ep.sourceName,
          brand_name: ep.brandName,
          primary_url: ep.primaryUrl,
          fallback_urls: ep.fallbackUrls,
          doc_or_portal_url: ep.docOrPortalUrl,
          auth_type: ep.authType,
          data_type: ep.dataType,
          sync_interval_minutes: ep.syncIntervalMinutes,
          cron_expression: ep.cronExpression,
          parser_type: ep.parserType,
          description: ep.description,
          active: ep.active,
          circuit_state: circuitBreakerService.getState(ep.sourceName),
          is_healthy: sh ? sh.is_healthy : true,
        };
      });

      return {
        status: 'UP',
        total_endpoints: endpoints.length,
        active_endpoints: endpoints.filter((e) => e.active).length,
        endpoints,
      };
    }
  );

  // Canlı CPO ve EPDK Senkronizasyonunu Tetikleme (TALEP-015)
  app.post(
    '/sources/sync',
    {
      schema: {
        description: 'Belirtilen CPO veya tüm açık endpointler için senkronizasyonu manuel tetikler.',
        tags: ['Health'],
        body: SyncTriggerRequestSchema,
        response: {
          200: SyncTriggerResponseSchema,
        },
      },
    },
    async (request) => {
      const { source_name, operator_id, all } = request.body;
      const results: any[] = [];
      const nowIso = new Date().toISOString();

      if (all) {
        const allRes = await cpoSyncService.syncAll({ force: true });
        for (const r of allRes) {
          results.push({
            source: r.source,
            operator_id: r.operatorId,
            synced_count: r.syncedCount,
            updated_at: r.updatedAt.toISOString(),
            circuit_state: r.circuitState,
            status: r.status,
            details: r.details,
          });
        }
      } else if (source_name) {
        const ep = CPO_ENDPOINTS.find((e) => e.sourceName === source_name || e.operatorSlug === source_name.toLowerCase());
        if (ep) {
          const res = await cpoSyncService.syncEndpoint(ep);
          results.push({
            source: res.source,
            operator_id: res.operatorId,
            synced_count: res.syncedCount,
            updated_at: res.updatedAt.toISOString(),
            circuit_state: res.circuitState,
            status: res.status,
            details: res.details,
          });
        } else {
          const opId = operator_id || 1;
          const res = await cpoSyncService.syncOperator(opId, source_name, 'https://api.zes.net/v1/stations/public');
          results.push({
            source: res.source,
            operator_id: res.operatorId,
            synced_count: res.syncedCount,
            updated_at: res.updatedAt.toISOString(),
            circuit_state: res.circuitState,
            status: res.status,
          });
        }
      } else if (operator_id !== undefined) {
        const ep = CPO_ENDPOINTS.find((e) => e.operatorId === operator_id);
        if (ep) {
          const res = await cpoSyncService.syncEndpoint(ep);
          results.push({
            source: res.source,
            operator_id: res.operatorId,
            synced_count: res.syncedCount,
            updated_at: res.updatedAt.toISOString(),
            circuit_state: res.circuitState,
            status: res.status,
            details: res.details,
          });
        } else {
          const res = await cpoSyncService.syncOperator(operator_id, `Operatör #${operator_id}`, 'https://api.zes.net/v1/stations/public');
          results.push({
            source: res.source,
            operator_id: res.operatorId,
            synced_count: res.syncedCount,
            updated_at: res.updatedAt.toISOString(),
            circuit_state: res.circuitState,
            status: res.status,
          });
        }
      } else {
        // Varsayılan tümünü senkronize et
        const allRes = await cpoSyncService.syncAll();
        for (const r of allRes) {
          results.push({
            source: r.source,
            operator_id: r.operatorId,
            synced_count: r.syncedCount,
            updated_at: r.updatedAt.toISOString(),
            circuit_state: r.circuitState,
            status: r.status,
            details: r.details,
          });
        }
      }

      return {
        status: 'COMPLETED',
        triggered_at: nowIso,
        results,
      };
    }
  );

  // Periyodik Cron Mekanizmasını Tetikleme (TALEP-015)
  app.post(
    '/cron/trigger',
    {
      schema: {
        description: 'CPO ve EPDK periyodik senkronizasyon cron görevini anında tetikler.',
        tags: ['Health'],
        response: {
          200: CronTriggerResponseSchema,
        },
      },
    },
    async () => {
      const nowIso = new Date().toISOString();
      const results = await cpoSyncService.syncAll();

      return {
        status: 'SUCCESS',
        message: `Cron senkronizasyonu tamamlandı. ${results.length} kaynak işlendi.`,
        triggered_at: nowIso,
        results: results.map((r) => ({
          source: r.source,
          operator_id: r.operatorId,
          synced_count: r.syncedCount,
          updated_at: r.updatedAt.toISOString(),
          circuit_state: r.circuitState,
          status: r.status,
          details: r.details,
        })),
      };
    }
  );
};
