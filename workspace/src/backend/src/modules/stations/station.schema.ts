
import { Type, type Static } from '@sinclair/typebox';

// TALEP-046: UAT-06 kök neden analizi — `bbox` eksik/geçersiz geldiğinde
// (örn. web istemcisinin SSR aşamasında henüz kullanıcı konumu/viewport
// hesaplanmamışken gönderdiği varsayılan istek) mevcut şema bunu 400 olarak
// reddetmiyor, ham `NaN` değerleri PostGIS katmanına sızıyor ve orada
// yakalanmayan bir hata 500'e dönüşüyordu. Backlog US-04 AC2: "BBox
// koordinat parametreleri WGS 84 sınırları dışında veya eksik verildiğinde
// API HTTP 400 Bad Request dönmelidir." — bu şema o kabul kriterini uygular.

const BBOX_PATTERN =
  '^-?\\d{1,3}(\\.\\d+)?,-?\\d{1,3}(\\.\\d+)?,-?\\d{1,3}(\\.\\d+)?,-?\\d{1,3}(\\.\\d+)?$';

export const StationsBBoxQuerySchema = Type.Object(
  {
    // "min_lon,min_lat,max_lon,max_lat" — WGS 84. Zorunludur; eksikse Ajv
    // required denetimiyle 400 döner (kendimiz throw etmeyiz).
    bbox: Type.String({
      pattern: BBOX_PATTERN,
      description: 'min_lon,min_lat,max_lon,max_lat (WGS 84)',
    }),
    // Zoom < 10 ise sunucu içi kümeleme (ST_SnapToGrid) uygulanır.
    zoom: Type.Integer({ minimum: 0, maximum: 22, default: 12 }),
    // Delta senkronizasyon köprüsü; bu uç noktada opsiyoneldir.
    since: Type.Optional(Type.Integer({ minimum: 0, description: 'epoch seconds' })),
  },
  { additionalProperties: false },
);
export type StationsBBoxQuery = Static<typeof StationsBBoxQuerySchema>;

export const StationsDeltaQuerySchema = Type.Object(
  {
    since: Type.Integer({ minimum: 0, description: 'epoch seconds' }),
  },
  { additionalProperties: false },
);
export type StationsDeltaQuery = Static<typeof StationsDeltaQuerySchema>;

export const StationSlugParamsSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 200 }),
});
export type StationSlugParams = Static<typeof StationSlugParamsSchema>;

// --- Nullable DTO Sözleşmesi (paket_secim_raporu / backlog US-06) ---
// Soket, güç ve tarife Faz 1'de yoktur; şema bu alanları `nullable: true`
// olarak tanımlar, uydurma varsayılan değer YOK.
export const OperatorRefSchema = Type.Union([
  Type.Object({
    id: Type.Integer(),
    slug: Type.String(),
    name: Type.String(),
    is_active: Type.Boolean(),
  }),
  Type.Null(),
]);

export const StationClusterSchema = Type.Object({
  type: Type.Literal('cluster'),
  cluster_count: Type.Integer({ minimum: 1 }),
  center_lat: Type.Number(),
  center_lon: Type.Number(),
});

export const StationPinSchema = Type.Object({
  type: Type.Literal('station'),
  station_uid: Type.String({ format: 'uuid' }),
  istasyon_no: Type.String(),
  slug: Type.String(),
  name: Type.Union([Type.String(), Type.Null()]),
  lat: Type.Number(),
  lon: Type.Number(),
  operator: OperatorRefSchema,
  connector_types: Type.Union([Type.Array(Type.String()), Type.Null()]),
  power_kw: Type.Union([Type.Number(), Type.Null()]),
  current_tariff: Type.Union([Type.Number(), Type.Null()]),
  data_freshness_hours: Type.Union([Type.Number(), Type.Null()]),
  updated_at: Type.String({ format: 'date-time' }),
});

export const StationsBBoxResponseSchema = Type.Object({
  mode: Type.Union([Type.Literal('cluster'), Type.Literal('detail')]),
  count: Type.Integer(),
  items: Type.Array(Type.Union([StationClusterSchema, StationPinSchema])),
});

export const StationDetailSchema = Type.Object({
  station_uid: Type.String({ format: 'uuid' }),
  istasyon_no: Type.String(),
  slug: Type.String(),
  name: Type.Union([Type.String(), Type.Null()]),
  address: Type.Union([Type.String(), Type.Null()]),
  city: Type.Union([Type.String(), Type.Null()]),
  district: Type.Union([Type.String(), Type.Null()]),
  lat: Type.Number(),
  lon: Type.Number(),
  operator: OperatorRefSchema,
  connector_types: Type.Union([Type.Array(Type.String()), Type.Null()]),
  power_kw: Type.Union([Type.Number(), Type.Null()]),
  current_tariff: Type.Union([Type.Number(), Type.Null()]),
  data_freshness_hours: Type.Union([Type.Number(), Type.Null()]),
  updated_at: Type.String({ format: 'date-time' }),
});
export type StationDetailDTO = Static<typeof StationDetailSchema>;

// RFC 7807 Problem Details — güvenlik tasarımı §4.2 ile birebir uyumlu.
// İç hata detayları (stack, SQL) hiçbir koşulda yanıta sızmaz.
export const ProblemDetailsSchema = Type.Object({
  type: Type.String(),
  title: Type.String(),
  status: Type.Integer(),
  detail: Type.Optional(Type.String()),
  instance: Type.Optional(Type.String()),
});
export type ProblemDetails = Static<typeof ProblemDetailsSchema>;

export const StationsBBoxSchemaDef = {
  querystring: StationsBBoxQuerySchema,
  response: {
    200: StationsBBoxResponseSchema,
    400: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
    503: ProblemDetailsSchema,
  },
} as const;

export const StationsDeltaSchemaDef = {
  querystring: StationsDeltaQuerySchema,
  response: {
    200: Type.Object({ count: Type.Integer(), items: Type.Array(StationPinSchema) }),
    400: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
} as const;

export const StationDetailSchemaDef = {
  params: StationSlugParamsSchema,
  response: {
    200: StationDetailSchema,
    404: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
} as const;
