
import { Type, type Static } from '@sinclair/typebox';

export const OperatorItemSchema = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  slug: Type.String(),
  is_active: Type.Boolean(),
  deep_link_config: Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()]),
});

export type OperatorItem = Static<typeof OperatorItemSchema>;

export const OperatorsResponseSchema = Type.Object({
  count: Type.Integer(),
  data: Type.Array(OperatorItemSchema),
});
