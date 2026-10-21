import { z } from '../Zod.ts';
import {
  partCodeSchema,
  partNameSchema,
  partStockQuantitySchema,
  partTypeSchema,
  unitPriceSchema,
} from './PartFields.ts';

/** A unidade de medida nao e editavel: mudaria o significado do saldo existente. */
export const updatePartInputSchema = z
  .object({
    code: partCodeSchema.optional(),
    name: partNameSchema.optional(),
    type: partTypeSchema.optional(),
    unitPrice: unitPriceSchema.optional(),
    minimumStock: partStockQuantitySchema.optional().openapi({ example: 3 }),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para atualizar',
  })
  .openapi('UpdatePartInput');

export type UpdatePartInput = z.infer<typeof updatePartInputSchema>;
