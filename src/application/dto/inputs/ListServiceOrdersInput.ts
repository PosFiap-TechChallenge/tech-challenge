import { serviceOrderSchema } from '../../../domain/schemas/ServiceOrderSchema.ts';
import { z } from '../Zod.ts';

export const SERVICE_ORDERS_DEFAULT_PAGE_SIZE = 20;
export const SERVICE_ORDERS_MAX_PAGE_SIZE = 100;

export const listServiceOrdersInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(SERVICE_ORDERS_MAX_PAGE_SIZE)
    .default(SERVICE_ORDERS_DEFAULT_PAGE_SIZE),
  status: serviceOrderSchema.shape.status
    .optional()
    .openapi({ description: 'Filtra as OS pelo status' }),
  customerId: serviceOrderSchema.shape.customerId
    .optional()
    .openapi({ description: 'Filtra as OS de um cliente' }),
});

export type ListServiceOrdersInput = z.infer<typeof listServiceOrdersInputSchema>;
