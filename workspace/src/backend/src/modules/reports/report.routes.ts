
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { reportService } from './report.service.js';
import {
  CreateReportBodySchema,
  CreateReportHeaderSchema,
  ReportResponseSchema,
  ReportSummaryResponseSchema,
} from './report.schema.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { config } from '../../config/env.js';

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // Kitle Kaynaklı Arıza Bildirimi (Zero-Storage / Proximity Proof)
  app.post(
    '/:id/reports',
    {
      schema: {
        description:
          'Kriptografik proximity proof ve anonim cihaz tasdiki ile istasyon arızası bildirir. Sıfır konum saklama uygulanır.',
        tags: ['Reports'],
        params: Type.Object({
          id: Type.String({ description: 'İstasyon UUID veya Slug' }),
        }),
        headers: CreateReportHeaderSchema,
        body: CreateReportBodySchema,
        response: {
          201: ReportResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: config.nodeEnv === 'test' ? 100 : config.reportRateLimitMax,
          timeWindow: '1 hour',
          keyGenerator: (request) => {
            const deviceUid = (request.headers['x-device-attestation'] as string) || '';
            return `${request.ip}:${deviceUid}`;
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const deviceAttestation = request.headers['x-device-attestation'] as string | undefined;

      if (!deviceAttestation || deviceAttestation.trim().length < 8) {
        throw new UnauthorizedError(
          'Arıza bildirimi yapabilmek için geçerli bir X-Device-Attestation başlığı gereklidir.',
          'MISSING_DEVICE_ATTESTATION',
          'Cihaz Tasdiki Gerekli'
        );
      }

      const { issue_type, nonce, proximity_proof, description } = request.body;

      const report = await reportService.createReport({
        stationIdentifier: id,
        deviceUid: deviceAttestation,
        issueType: issue_type,
        nonce,
        proximityProof: proximity_proof,
        description,
      });

      return reply.status(201).send(report);
    }
  );

  // İstasyon Arıza Özeti
  app.get(
    '/:id/reports/summary',
    {
      schema: {
        description: 'İstasyonun aktif arıza bildirim durumunu ve risk etiketini döner.',
        tags: ['Reports'],
        params: Type.Object({
          id: Type.String({ description: 'İstasyon UUID veya Slug' }),
        }),
        response: {
          200: ReportSummaryResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      return reportService.getSummary(id);
    }
  );
};
