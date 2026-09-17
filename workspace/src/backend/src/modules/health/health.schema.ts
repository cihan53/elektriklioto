
import { Type } from '@sinclair/typebox';

export const SourceHealthItemSchema = Type.Object({
  id: Type.Integer(),
  operator_id: Type.Integer(),
  source_name: Type.String(),
  endpoint_url: Type.String(),
  circuit_state: Type.String(),
  consecutive_failures: Type.Integer(),
  last_successful_sync: Type.Union([Type.String(), Type.Null()]),
  last_attempt_at: Type.Union([Type.String(), Type.Null()]),
  last_error: Type.Union([Type.String(), Type.Null()]),
  is_healthy: Type.Boolean(),
});

export const SourcesHealthResponseSchema = Type.Object({
  status: Type.String(),
  total_sources: Type.Integer(),
  healthy_sources: Type.Integer(),
  stale_sources: Type.Integer(),
  sources: Type.Array(SourceHealthItemSchema),
});

export const QueueStatsResponseSchema = Type.Object({
  pending: Type.Integer(),
  processing: Type.Integer(),
  completed: Type.Integer(),
  failed: Type.Integer(),
  total: Type.Integer(),
});
