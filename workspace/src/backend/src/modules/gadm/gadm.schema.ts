
import { Type } from '@sinclair/typebox';

export const CoordinatesSchema = Type.Object({
  lat: Type.Number(),
  lon: Type.Number(),
});

export const BBoxSchema = Type.Object({
  min_lon: Type.Number(),
  min_lat: Type.Number(),
  max_lon: Type.Number(),
  max_lat: Type.Number(),
});

export const ProvinceItemSchema = Type.Object({
  gid: Type.String(),
  name: Type.String(),
  slug: Type.String(),
  plate_code: Type.Integer(),
  center: CoordinatesSchema,
  bbox: BBoxSchema,
  district_count: Type.Integer(),
});

export const ProvinceListResponseSchema = Type.Array(ProvinceItemSchema);

export const DistrictItemSchema = Type.Object({
  gid: Type.String(),
  province_slug: Type.String(),
  province_name: Type.String(),
  name: Type.String(),
  slug: Type.String(),
  center: CoordinatesSchema,
  bbox: BBoxSchema,
  neighborhood_count: Type.Integer(),
});

export const DistrictListResponseSchema = Type.Array(DistrictItemSchema);

export const NeighborhoodItemSchema = Type.Object({
  gid: Type.String(),
  province_slug: Type.String(),
  district_slug: Type.String(),
  name: Type.String(),
  slug: Type.String(),
  center: CoordinatesSchema,
  bbox: BBoxSchema,
  postal_code: Type.Optional(Type.String()),
});

export const NeighborhoodListResponseSchema = Type.Array(NeighborhoodItemSchema);

export const GeocodeResultSchema = Type.Object({
  query: Type.String(),
  type: Type.String(),
  name: Type.String(),
  display_name: Type.String(),
  province: Type.String(),
  district: Type.Union([Type.String(), Type.Null()]),
  neighborhood: Type.Union([Type.String(), Type.Null()]),
  coordinates: CoordinatesSchema,
  bbox: BBoxSchema,
  gadm_id: Type.String(),
  confidence: Type.Number(),
});

export const ReverseGeocodeResultSchema = Type.Object({
  coordinates: CoordinatesSchema,
  province: Type.String(),
  province_slug: Type.String(),
  district: Type.Union([Type.String(), Type.Null()]),
  district_slug: Type.Union([Type.String(), Type.Null()]),
  neighborhood: Type.Union([Type.String(), Type.Null()]),
  neighborhood_slug: Type.Union([Type.String(), Type.Null()]),
  formatted_address: Type.String(),
  distance_meters: Type.Number(),
  gadm_id: Type.String(),
});

export const SearchResultItemSchema = Type.Object({
  type: Type.String(),
  name: Type.String(),
  display_name: Type.String(),
  slug: Type.String(),
  province_name: Type.String(),
  district_name: Type.Optional(Type.String()),
  coordinates: CoordinatesSchema,
  bbox: BBoxSchema,
});

export const SearchResultListResponseSchema = Type.Array(SearchResultItemSchema);

export const SearchQuerySchema = Type.Object({
  q: Type.String({ minLength: 1 }),
  limit: Type.Optional(Type.Number({ default: 10, maximum: 50 })),
});

export const GeocodeQuerySchema = Type.Object({
  q: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
});

export const ReverseGeocodeQuerySchema = Type.Object({
  lat: Type.Number(),
  lon: Type.Number(),
});
