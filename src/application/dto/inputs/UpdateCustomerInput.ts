import { customerSchema } from '../../../domain/schemas/CustomerSchema.ts';
import type { z } from 'zod';
import '../Zod.ts';
import { hasAnyField } from './hasAnyField.ts';

export const updateCustomerInputSchema = customerSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .refine(hasAnyField, { message: 'Informe ao menos um campo para atualizar' })
  .openapi('UpdateCustomerInput', {
    description: 'Campos omitidos nao mudam; null remove e-mail ou telefone',
  });

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;
