import type { z } from 'zod';
import { partSchema } from '../../../domain/schemas/PartSchema.ts';
import '../Zod.ts';

export const createPartInputSchema = partSchema
  .pick({ code: true, name: true, type: true, unit: true, unitPrice: true, minimumStock: true })
  .extend({
    initialQuantity: partSchema.shape.quantity.describe('Estoque inicial registrado no cadastro'),
  })
  .openapi('CreatePartInput', {
    example: {
      code: 'OLEO-5W30',
      name: 'Oleo 5W30',
      type: 'SUPPLY',
      unit: 'L',
      unitPrice: 45.9,
      minimumStock: 5,
      initialQuantity: 20.5,
    },
  });

export type CreatePartInput = z.infer<typeof createPartInputSchema>;
