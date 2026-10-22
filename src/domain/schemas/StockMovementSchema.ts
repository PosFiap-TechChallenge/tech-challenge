import { z } from 'zod';
import { STOCK_MOVEMENT_TYPES } from '../value-objects/StockMovement.ts';
import { quantitySchema } from './QuantitySchema.ts';

const adjustmentReasonSchema = z.string().trim().min(1).max(255);

/** Ajuste de estoque: a quantidade contada substitui o saldo fisico, sempre com motivo. */
export const stockAdjustmentSchema = z.object({
  quantity: quantitySchema(),
  reason: adjustmentReasonSchema,
});

/** Espelha a tabela `stock_movements`, sem `sequence`, que so ordena as linhas no banco. */
export const stockMovementSchema = z.object({
  id: z.uuid(),
  partId: z.uuid(),
  type: z.enum(STOCK_MOVEMENT_TYPES),
  quantity: z
    .number()
    .describe(
      'Quantidade movimentada; em ADJUSTMENT, a diferenca aplicada ao saldo (pode ser negativa)',
    ),
  balanceAfter: quantitySchema(),
  reservedAfter: quantitySchema(),
  reason: adjustmentReasonSchema.nullable(),
  createdAt: z.date(),
});

export type StockMovementData = z.infer<typeof stockMovementSchema>;
