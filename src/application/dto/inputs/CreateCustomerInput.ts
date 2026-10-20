import { z } from '../Zod.ts';
import {
  customerEmailSchema,
  customerNameSchema,
  customerPhoneSchema,
  taxDocumentSchema,
} from './CustomerFields.ts';

export const createCustomerInputSchema = z
  .object({
    name: customerNameSchema,
    document: taxDocumentSchema,
    email: customerEmailSchema.nullable().default(null),
    phone: customerPhoneSchema.nullable().default(null),
  })
  .openapi('CreateCustomerInput');

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;
