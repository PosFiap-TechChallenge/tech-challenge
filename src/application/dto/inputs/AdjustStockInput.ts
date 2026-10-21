import { z } from '../Zod.ts';
import { partAdjustmentReasonSchema, partStockQuantitySchema } from './PartFields.ts';

export const adjustStockInputSchema = z
  .object({
    quantity: partStockQuantitySchema.openapi({
      description:
        'Saldo fisico contado; substitui o saldo atual e nao pode ser menor que o reservado',
      example: 18.25,
    }),
    reason: partAdjustmentReasonSchema,
  })
  .openapi('AdjustStockInput');

export type AdjustStockInput = z.infer<typeof adjustStockInputSchema>;
