import { serviceOrderSchema } from '../../../domain/schemas/ServiceOrderSchema.ts';
import { z } from '../Zod.ts';

export const serviceOrderIdParamsSchema = serviceOrderSchema.pick({ id: true });

export const serviceOrderItemParamsSchema = z.object({
  id: serviceOrderSchema.shape.id,
  itemId: z.uuid().describe('Id do item de servico ou de peca dentro da OS'),
});
