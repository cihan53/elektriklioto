
import { Type, Static } from '@sinclair/typebox';

/**
 * Faz 1 Zorunlu Kısıt:
 * Soket tipi, güç, tarife ve anlık doluluk verisi Faz 1 başlangıcında YOKTUR.
 * Şema bu alanları NULL kabul eder; uydurma veri girilemez.
 */
export const NullableConnectorItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  socket_type: Type.Union([Type.String(), Type.Null()]),
  power_kw: Type.Union([Type.Number(), Type.Null()]),
  current_type: Type.Union([Type.String(), Type.Null()]),
  status: Type.Union([Type.String(), Type.Null()]),
  last_status_update: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

export const NullableTariffDetailSchema = Type.Object({
  price_per_kwh: Type.Number(),
  currency: Type.String(),
  valid_from: Type.String({ format: 'date-time' }),
  source: Type.String(),
  confidence: Type.String(),
});

export const StationCoordinatesSchema = Type.Object({
  lat: Type.Number({ minimum: -90, maximum: 90 }),
  lon: Type.Number({ minimum: -180, maximum: 180 }),
});

export const StationOperatorSummarySchema = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  name: Type.String(),
  logo_url: Type.Union([Type.String(), Type.Null()]),
  website_url: Type.Union([Type.String(), Type.Null()]),
  is_active: Type.Boolean(),
});

export const DataBadgeSchema = Type.Object({
  code: Type.String(),
  label: Type.String(),
  description: Type.String(),
});

export const StationDeepLinkInfoSchema = Type.Object({
  operator_slug: Type.String(),
  station_code: Type.String(),
  app_scheme_url: Type.Union([Type.String(), Type.Null()]),
  universal_link_url: Type.Union([Type.String(), Type.Null()]),
  store_urls: Type.Object({
    ios: Type.Union([Type.String(), Type.Null()]),
    android: Type.Union([Type.String(), Type.Null()]),
  }),
  clipboard_fallback: Type.Boolean(),
  clipboard_text: Type.String(),
});

export const StationDetailResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  istasyon_no: Type.String(),
  slug: Type.String(),
  name: Type.String(),
  address: Type.Union([Type.String(), Type.Null()]),
  city: Type.Union([Type.String(), Type.Null()]),
  district: Type.Union([Type.String(), Type.Null()]),
  coordinates: StationCoordinatesSchema,
  operator: StationOperatorSummarySchema,
  // ZORUNLU KISIT: Nullable eksik veri alanları
  connectors: Type.Union([Type.Array(NullableConnectorItemSchema), Type.Null()]),
  power_kw: Type.Union([Type.Number(), Type.Null()]),
  current_tariff: Type.Union([NullableTariffDetailSchema, Type.Null()]),
  live_status: Type.Union([Type.String(), Type.Null()]),
  data_badge: DataBadgeSchema,
  deep_link: StationDeepLinkInfoSchema,
  updated_at: Type.String({ format: 'date-time' }),
});

export const StationDeepLinkResponseSchema = Type.Object({
  station_id: Type.String({ format: 'uuid' }),
  station_code: Type.String(),
  station_name: Type.String(),
  operator_slug: Type.String(),
  operator_name: Type.String(),
  app_scheme_url: Type.Union([Type.String(), Type.Null()]),
  universal_link_url: Type.Union([Type.String(), Type.Null()]),
  store_urls: Type.Object({
    ios: Type.Union([Type.String(), Type.Null()]),
    android: Type.Union([Type.String(), Type.Null()]),
  }),
  clipboard_fallback: Type.Boolean(),
  clipboard_text: Type.String(),
  instructions: Type.String(),
});

export const StationParamsSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 255 }),
});

export const StationsQuerySchema = Type.Object({
  bbox: Type.String({
    description: 'Harita sınır kutusu formatı: min_lon,min_lat,max_lon,max_lat (Örn: 28.9,41.0,29.1,41.2)',
  }),
  zoom: Type.Optional(
    Type.Integer({
      minimum: 0,
      maximum: 22,
      default: 12,
      description: 'Harita yakınlaştırma seviyesi. zoom < 10 kümelenmiş özet veri; zoom >= 10 tekil istasyon döner.',
    })
  ),
  operator: Type.Optional(
    Type.String({
      description: 'Operatör slug filtresi (Örn: zes, trugo, esarj)',
    })
  ),
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 5000,
      default: 1000,
      description: 'Maksimum dönecek istasyon sayısı',
    })
  ),
});

export type StationsQuery = Static<typeof StationsQuerySchema>;

export const ClusterItemSchema = Type.Object({
  cluster_id: Type.String(),
  count: Type.Integer(),
  lat: Type.Number(),
  lon: Type.Number(),
});

export type ClusterItem = Static<typeof ClusterItemSchema>;

export const StationListItemSchema = Type.Object({
  id: Type.String(),
  istasyon_no: Type.String(),
  slug: Type.String(),
  name: Type.String(),
  operator: Type.Object({
    id: Type.Integer(),
    name: Type.String(),
    slug: Type.String(),
    logo_url: Type.Union([Type.String(), Type.Null()]),
    is_active: Type.Boolean(),
  }),
  lat: Type.Number(),
  lon: Type.Number(),
  address: Type.Union([Type.String(), Type.Null()]),
  city: Type.Union([Type.String(), Type.Null()]),
  district: Type.Union([Type.String(), Type.Null()]),
  connector_types: Type.Null(),
  power_kw: Type.Null(),
  current_tariff: Type.Null(),
  connectors: Type.Null(),
  status: Type.Union([Type.String(), Type.Null()]),
  updated_at: Type.String(),
});

export type StationListItem = Static<typeof StationListItemSchema>;

export const StationsResponseSchema = Type.Object({
  type: Type.Union([Type.Literal('stations'), Type.Literal('clusters')]),
  zoom: Type.Integer(),
  count: Type.Integer(),
  data: Type.Union([
    Type.Array(StationListItemSchema),
    Type.Array(ClusterItemSchema),
  ]),
});

export type StationsResponse = Static<typeof StationsResponseSchema>;

export type StationDetailResponse = Static<typeof StationDetailResponseSchema>;
export type StationDeepLinkResponse = Static<typeof StationDeepLinkResponseSchema>;
