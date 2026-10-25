import { z } from '../Zod.ts';

export const SERVICES_DEFAULT_PAGE_SIZE = 20;
export const SERVICES_MAX_PAGE_SIZE = 100;

export const listServicesInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(SERVICES_MAX_PAGE_SIZE)
    .default(SERVICES_DEFAULT_PAGE_SIZE),
});

export type ListServicesInput = z.infer<typeof listServicesInputSchema>;
