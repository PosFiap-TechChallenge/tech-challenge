import { z } from '../Zod.ts';
import {
  customerEmailSchema,
  customerNameSchema,
  customerPhoneSchema,
  taxDocumentSchema,
} from './CustomerFields.ts';

export const updateCustomerInputSchema = z
  .object({
    name: customerNameSchema.optional(),
    document: taxDocumentSchema.optional(),
    email: customerEmailSchema
      .nullable()
      .optional()
      .openapi({ description: 'null remove o e-mail' }),
    phone: customerPhoneSchema
      .nullable()
      .optional()
      .openapi({ description: 'null remove o telefone' }),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para atualizar',
  })
  .openapi('UpdateCustomerInput');

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;
