import { z } from '../Zod.ts';
import { partMovementQuantitySchema } from './PartFields.ts';

export const registerStockEntryInputSchema = z
  .object({
    quantity: partMovementQuantitySchema.openapi({
      description: 'Quantidade recebida, na unidade da peca, somada ao saldo fisico',
      example: 5,
    }),
  })
  .openapi('RegisterStockEntryInput');

export type RegisterStockEntryInput = z.infer<typeof registerStockEntryInputSchema>;
