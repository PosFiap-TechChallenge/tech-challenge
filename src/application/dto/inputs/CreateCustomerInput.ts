import { customerSchema } from '../../../domain/schemas/CustomerSchema.ts';
import type { z } from 'zod';
import '../Zod.ts';

export const createCustomerInputSchema = customerSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    email: customerSchema.shape.email.default(null),
    phone: customerSchema.shape.phone.default(null),
  })
  .openapi('CreateCustomerInput');

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;
