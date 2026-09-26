
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

export const CPOEndpointItemSchema = Type.Object({
  id: Type.Integer(),
  operator_id: Type.Integer(),
  operator_slug: Type.String(),
  source_name: Type.String(),
  brand_name: Type.String(),
  primary_url: Type.String(),
  fallback_urls: Type.Array(Type.String()),
  doc_or_portal_url: Type.String(),
  auth_type: Type.String(),
  data_type: Type.String(),
  sync_interval_minutes: Type.Integer(),
  cron_expression: Type.String(),
  parser_type: Type.String(),
  description: Type.String(),
  active: Type.Boolean(),
  circuit_state: Type.String(),
  is_healthy: Type.Boolean(),
});

export const CPOEndpointsResponseSchema = Type.Object({
  status: Type.String(),
  total_endpoints: Type.Integer(),
  active_endpoints: Type.Integer(),
  endpoints: Type.Array(CPOEndpointItemSchema),
});

export const SyncTriggerRequestSchema = Type.Object({
  source_name: Type.Optional(Type.String()),
  operator_id: Type.Optional(Type.Integer()),
  all: Type.Optional(Type.Boolean()),
});

export const SyncResultItemSchema = Type.Object({
  source: Type.String(),
  operator_id: Type.Integer(),
  synced_count: Type.Integer(),
  updated_at: Type.String(),
  circuit_state: Type.String(),
  status: Type.Optional(Type.String()),
  details: Type.Optional(Type.String()),
});

export const SyncTriggerResponseSchema = Type.Object({
  status: Type.String(),
  triggered_at: Type.String(),
  results: Type.Array(SyncResultItemSchema),
});

export const CronTriggerResponseSchema = Type.Object({
  status: Type.String(),
  message: Type.String(),
  triggered_at: Type.String(),
  results: Type.Array(SyncResultItemSchema),
});

// TALEP-025: Canlı Sürüm Bilgisi Şeması (Hassas altyapı ve veritabanı detayları gizlenmiştir)
export const HealthVersionResponseSchema = Type.Object({
  status: Type.String(),
  service: Type.String(),
  version: Type.String(),
  release_date: Type.String(),
  timestamp: Type.String(),
});
