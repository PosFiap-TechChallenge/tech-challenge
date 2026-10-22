import { partSchema } from '../../../domain/schemas/PartSchema.ts';
import { movementQuantitySchema } from '../../../domain/schemas/QuantitySchema.ts';
import { z } from '../Zod.ts';

export const STOCK_ITEMS_MAX = 100;

/**
 * Itens de um orcamento ou ordem de servico a reservar, liberar ou consumir.
 * Cada peca aparece uma vez: quem chama agrega as quantidades antes.
 */
export const stockItemsInputSchema = z.object({
  items: z
    .array(z.object({ partId: partSchema.shape.id, quantity: movementQuantitySchema() }))
    .min(1)
    .max(STOCK_ITEMS_MAX)
    .refine((items) => new Set(items.map((item) => item.partId)).size === items.length, {
      message: 'Cada peca deve aparecer uma unica vez no lote',
    }),
});

export type StockItemsInput = z.infer<typeof stockItemsInputSchema>;
