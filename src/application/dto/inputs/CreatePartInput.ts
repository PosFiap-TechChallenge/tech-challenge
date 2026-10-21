import { z } from '../Zod.ts';
import {
  measurementUnitSchema,
  partCodeSchema,
  partNameSchema,
  partStockQuantitySchema,
  partTypeSchema,
  unitPriceSchema,
} from './PartFields.ts';

export const createPartInputSchema = z
  .object({
    code: partCodeSchema,
    name: partNameSchema,
    type: partTypeSchema.openapi({ example: 'SUPPLY' }),
    unit: measurementUnitSchema.openapi({ example: 'L' }),
    unitPrice: unitPriceSchema,
    initialQuantity: partStockQuantitySchema.openapi({
      description: 'Estoque inicial registrado no cadastro',
      example: 20.5,
    }),
    minimumStock: partStockQuantitySchema.openapi({
      description:
        'Ao consumir, saldo menor ou igual a este valor sinaliza estoque minimo atingido',
      example: 5,
    }),
  })
  .openapi('CreatePartInput');

export type CreatePartInput = z.infer<typeof createPartInputSchema>;
