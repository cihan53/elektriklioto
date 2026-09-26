
import { Type } from '@sinclair/typebox';

export const OperatorSchema = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  name: Type.String(),
  is_active: Type.Boolean(),
  station_count: Type.Optional(Type.Integer()),
  deep_link_config: Type.Optional(
    Type.Union([
      Type.Object({
        scheme: Type.Optional(Type.String()),
        android_package: Type.Optional(Type.String()),
        ios_app_store_id: Type.Optional(Type.String()),
        clipboard_fallback: Type.Optional(Type.Boolean()),
      }),
      Type.Null(),
    ])
  ),
});

export const OperatorListResponseSchema = Type.Array(OperatorSchema);
