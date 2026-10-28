import { z } from 'zod';
import { partSchema } from './PartSchema.ts';
import { movementQuantitySchema } from './QuantitySchema.ts';

/** Peca ou insumo incluido em uma OS, com dados e preco copiados do estoque. */
export const partItemSchema = z.object({
  id: z.uuid(),
  partId: z.uuid().describe('Peca do estoque que originou o item'),
  code: partSchema.shape.code,
  name: partSchema.shape.name,
  unit: partSchema.shape.unit,
  quantity: movementQuantitySchema().describe('Quantidade na unidade de medida da peca'),
  unitPrice: partSchema.shape.unitPrice.describe('Preco unitario congelado na inclusao'),
  createdAt: z.date(),
});

export type PartItemData = z.infer<typeof partItemSchema>;
