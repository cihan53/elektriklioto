
import { Type, type Static } from '@sinclair/typebox';

export const StationsQuerySchema = Type.Object({
  bbox: Type.String({
    description: 'Harita sınır kutusu formatı: min_lon,min_lat,max_lon,max_lat (Örn: 28.9,41.0,29.1,41.2)',
    examples: ['28.9,41.0,29.1,41.2'],
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

export const StationItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
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
  // Faz 1 Zorunlu Kısıt: Soket tipi, güç ve tarife verisi kaynakta yoktur; kesinlikle NULL döner.
  connector_types: Type.Null({
    description: 'Faz 1: Soket tipi verisi kaynakta henüz yer almamaktadır; NULL döner.',
  }),
  power_kw: Type.Null({
    description: 'Faz 1: Güç verisi kaynakta henüz yer almamaktadır; NULL döner.',
  }),
  current_tariff: Type.Null({
    description: 'Faz 1: Tarife bilgisi kaynakta henüz yer almamaktadır; NULL döner.',
  }),
  connectors: Type.Union([Type.Array(Type.Any()), Type.Null()], {
    description: 'Faz 1: Soket envanteri boş döner.',
  }),
  status: Type.Union([Type.String(), Type.Null()]),
  updated_at: Type.String({ format: 'date-time' }),
});

export type StationItem = Static<typeof StationItemSchema>;

export const ClusterItemSchema = Type.Object({
  cluster_id: Type.String(),
  count: Type.Integer(),
  lat: Type.Number(),
  lon: Type.Number(),
});

export type ClusterItem = Static<typeof ClusterItemSchema>;

export const StationsResponseSchema = Type.Object({
  type: Type.Union([Type.Literal('stations'), Type.Literal('clusters')]),
  zoom: Type.Integer(),
  count: Type.Integer(),
  data: Type.Union([
    Type.Array(StationItemSchema),
    Type.Array(ClusterItemSchema),
  ]),
});

export const StationDetailParamsSchema = Type.Object({
  slug: Type.String({
    description: 'İstasyonun kanonik slug kimliği (Örn: zes-istanbul-kadikoy-srj-00001)',
  }),
});

export const StationDetailResponseSchema = Type.Object({
  data: StationItemSchema,
  disclaimer: Type.String({
    description: 'Yasal EMP Feragatnamesi',
  }),
});
