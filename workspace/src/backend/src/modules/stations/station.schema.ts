
import { Type } from '@sinclair/typebox';

export const DeepLinkResultSchema = Type.Object({
  deep_link_url: Type.Union([Type.String(), Type.Null()]),
  clipboard_fallback: Type.Boolean(),
  clipboard_text: Type.Union([Type.String(), Type.Null()]),
});

export const OperatorSummarySchema = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  slug: Type.String(),
  deep_link_config: Type.Optional(Type.Any()),
});

export const FreshnessBadgeSchema = Type.Object({
  is_stale: Type.Boolean(),
  last_updated_text: Type.String(),
});

export const StationSummarySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  istasyon_no: Type.String(),
  slug: Type.String(),
  name: Type.String(),
  lat: Type.Number(),
  lon: Type.Number(),
  city: Type.String(),
  district: Type.String(),
  operator_id: Type.Integer(),
  operator_name: Type.String(),
  operator: Type.Optional(OperatorSummarySchema),
  is_flagged_defective: Type.Boolean(),
});

export const ClusterItemSchema = Type.Object({
  cluster_id: Type.String(),
  count: Type.Integer(),
  lat: Type.Number(),
  lon: Type.Number(),
});

export const StationsResponseSchema = Type.Object({
  type: Type.String(),
  zoom: Type.Number(),
  count: Type.Integer(),
  data: Type.Array(Type.Any()),
});

export const StationDetailResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  istasyon_no: Type.String(),
  slug: Type.String(),
  name: Type.String(),
  address: Type.String(),
  city: Type.String(),
  district: Type.String(),
  lat: Type.Number(),
  lon: Type.Number(),
  updated_at: Type.String(),
  is_flagged_defective: Type.Boolean(),
  operator: OperatorSummarySchema,
  deep_link: DeepLinkResultSchema,
  // ZORUNLU KISIT: Eksik Veri Modeli (Nullable Fields)
  connector_types: Type.Union([Type.Array(Type.String()), Type.Null()]),
  power_kw: Type.Union([Type.Number(), Type.Null()]),
  current_tariff: Type.Union([Type.String(), Type.Null()]),
  occupancy_status: Type.Union([Type.String(), Type.Null()]),
  // S5 Veri Tazeliği Rozeti (US-18)
  data_freshness: Type.Optional(FreshnessBadgeSchema),
});

export const StationQuerySchema = Type.Object({
  bbox: Type.Optional(Type.String({ description: 'minLon,minLat,maxLon,maxLat' })),
  zoom: Type.Optional(Type.Number({ default: 12 })),
  operator: Type.Optional(Type.String()),
  city: Type.Optional(Type.String()),
  district: Type.Optional(Type.String()),
  q: Type.Optional(Type.String()),
});

export const StationSearchResponseSchema = Type.Object({
  query: Type.String(),
  matched_region: Type.Optional(
    Type.Object({
      type: Type.String(),
      name: Type.String(),
      province: Type.String(),
      district: Type.Union([Type.String(), Type.Null()]),
      center: Type.Object({
        lat: Type.Number(),
        lon: Type.Number(),
      }),
      bbox: Type.Object({
        min_lon: Type.Number(),
        min_lat: Type.Number(),
        max_lon: Type.Number(),
        max_lat: Type.Number(),
      }),
    })
  ),
  stations: Type.Array(StationSummarySchema),
});
