import type { z } from 'zod';
import { stockAdjustmentSchema } from '../../../domain/schemas/StockMovementSchema.ts';
import '../Zod.ts';

export const adjustStockInputSchema = stockAdjustmentSchema
  .extend({
    quantity: stockAdjustmentSchema.shape.quantity.describe(
      'Saldo fisico contado; substitui o saldo atual e nao pode ser menor que o reservado',
    ),
  })
  .openapi('AdjustStockInput', {
    example: { quantity: 18.25, reason: 'Inventario mensal: 2 litros perdidos em vazamento' },
  });

export type AdjustStockInput = z.infer<typeof adjustStockInputSchema>;
