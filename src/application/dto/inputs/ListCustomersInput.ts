import { z } from '../Zod.ts';

export const CUSTOMERS_DEFAULT_PAGE_SIZE = 20;
export const CUSTOMERS_MAX_PAGE_SIZE = 100;

export const listCustomersInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(CUSTOMERS_MAX_PAGE_SIZE)
    .default(CUSTOMERS_DEFAULT_PAGE_SIZE),
});

export type ListCustomersInput = z.infer<typeof listCustomersInputSchema>;
