import { movementQuantitySchema } from '../../../domain/schemas/QuantitySchema.ts';
import { z } from '../Zod.ts';

export const registerStockEntryInputSchema = z
  .object({
    quantity: movementQuantitySchema().describe(
      'Quantidade recebida, na unidade da peca, somada ao saldo fisico',
    ),
  })
  .openapi('RegisterStockEntryInput');

export type RegisterStockEntryInput = z.infer<typeof registerStockEntryInputSchema>;
