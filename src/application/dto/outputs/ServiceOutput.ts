import { serviceSchema } from '../../../domain/schemas/ServiceSchema.ts';
import { z } from '../Zod.ts';
import { timestampsOutputShape } from './TimestampsOutput.ts';

export const serviceOutputSchema = serviceSchema
  .extend({
    ...timestampsOutputShape,
  })
  .openapi('ServiceOutput');

export type ServiceOutput = z.infer<typeof serviceOutputSchema>;

export const servicePageOutputSchema = z
  .object({
    items: z.array(serviceOutputSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi('ServicePageOutput');

export type ServicePageOutput = z.infer<typeof servicePageOutputSchema>;
