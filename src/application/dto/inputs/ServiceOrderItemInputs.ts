import { partSchema } from '../../../domain/schemas/PartSchema.ts';
import { movementQuantitySchema } from '../../../domain/schemas/QuantitySchema.ts';
import { serviceSchema } from '../../../domain/schemas/ServiceSchema.ts';
import { z } from '../Zod.ts';

export const addOrderServiceInputSchema = z
  .object({ serviceId: serviceSchema.shape.id.describe('Servico do catalogo') })
  .openapi('AddOrderServiceInput');

export type AddOrderServiceInput = z.infer<typeof addOrderServiceInputSchema>;

export const addOrderPartInputSchema = z
  .object({
    partId: partSchema.shape.id.describe('Peca ou insumo do estoque'),
    quantity: movementQuantitySchema().describe(
      'Quantidade na unidade da peca; somada se a peca ja estiver na OS',
    ),
  })
  .openapi('AddOrderPartInput', {
    example: { partId: '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f', quantity: 2 },
  });

export type AddOrderPartInput = z.infer<typeof addOrderPartInputSchema>;
