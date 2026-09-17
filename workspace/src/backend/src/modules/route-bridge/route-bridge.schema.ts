
import { Type } from '@sinclair/typebox';

export const CreateRouteRequestSchema = Type.Object({
  stops: Type.Array(Type.String({ format: 'uuid' }), { minItems: 1, maxItems: 25 }),
  expires_in_hours: Type.Optional(Type.Number({ default: 48, maximum: 48 })),
});

export const CreateRouteResponseSchema = Type.Object({
  code: Type.String(),
  url: Type.String(),
  qr_svg: Type.Optional(Type.String()),
  expires_at: Type.String(),
});

export const RouteDetailResponseSchema = Type.Object({
  version: Type.Number(),
  stops: Type.Array(Type.String()),
  expires_at: Type.Number(),
  is_valid: Type.Boolean(),
});
