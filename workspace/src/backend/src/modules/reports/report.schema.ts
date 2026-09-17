
import { Type } from '@sinclair/typebox';

export const IssueTypeSchema = Type.Union([
  Type.Literal('DEFECTIVE'),
  Type.Literal('CABLE_LOCKED'),
  Type.Literal('ICE_BLOCK'),
  Type.Literal('ACCESS_ISSUE'),
  Type.Literal('OTHER'),
]);

export const CreateReportHeaderSchema = Type.Object({
  'x-device-attestation': Type.Optional(Type.String({ minLength: 8, description: 'Anonim Cihaz Tasdik Belirteci' })),
});

export const CreateReportBodySchema = Type.Object({
  issue_type: IssueTypeSchema,
  nonce: Type.String({ minLength: 16, maxLength: 64, description: 'Rastgele 16+ byte tek kullanımlık dize' }),
  proximity_proof: Type.String({ minLength: 64, maxLength: 64, description: 'HMAC-SHA256 64-karakter hex çıktısı' }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
});

export const ReportResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  station_id: Type.String({ format: 'uuid' }),
  issue_type: Type.String(),
  proximity_verified: Type.Boolean(),
  is_flagged_defective: Type.Boolean(),
  created_at: Type.String(),
});

export const ReportSummaryResponseSchema = Type.Object({
  station_id: Type.String({ format: 'uuid' }),
  is_flagged_defective: Type.Boolean(),
  active_report_count: Type.Number(),
  defect_threshold: Type.Number(),
});
