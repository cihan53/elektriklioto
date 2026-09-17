
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { sourceHealthService } from '../worker/source-health.service.js';
import { skipLockedQueue } from '../queue/skip-locked-queue.js';
import { SourcesHealthResponseSchema, QueueStatsResponseSchema } from './health.schema.js';

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
};
