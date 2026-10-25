import type { z } from 'zod';
import { serviceSchema } from '../../../domain/schemas/ServiceSchema.ts';
import '../Zod.ts';

export const createServiceInputSchema = serviceSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .openapi('CreateServiceInput', {
    example: { name: 'Troca de oleo', price: 120, estimatedMinutes: 45 },
  });

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;
