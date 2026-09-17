
import { Type, Static } from '@sinclair/typebox';

export const DeepLinkConfigSchema = Type.Object({
  iosSchemeTemplate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  androidSchemeTemplate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  universalLinkTemplate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  storeUrls: Type.Optional(
    Type.Object({
      ios: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      android: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    })
  ),
  clipboardFallback: Type.Boolean(),
  notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const OperatorSummarySchema = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  name: Type.String(),
  logo_url: Type.Union([Type.String(), Type.Null()]),
  website_url: Type.Union([Type.String(), Type.Null()]),
  is_active: Type.Boolean(),
  supports_deep_link: Type.Boolean(),
  station_count: Type.Optional(Type.Integer()),
});

export const OperatorDetailSchema = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  name: Type.String(),
  logo_url: Type.Union([Type.String(), Type.Null()]),
  website_url: Type.Union([Type.String(), Type.Null()]),
  is_active: Type.Boolean(),
  deep_link_config: DeepLinkConfigSchema,
  station_count: Type.Integer(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
});

export const OperatorsQuerySchema = Type.Object({
  active_only: Type.Optional(Type.Boolean({ default: true })),
  search: Type.Optional(Type.String()),
});

export const OperatorParamsSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 128 }),
});

export type OperatorSummary = Static<typeof OperatorSummarySchema>;
export type OperatorDetail = Static<typeof OperatorDetailSchema>;
