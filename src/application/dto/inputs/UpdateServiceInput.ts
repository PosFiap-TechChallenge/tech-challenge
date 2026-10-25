import type { z } from 'zod';
import { serviceSchema } from '../../../domain/schemas/ServiceSchema.ts';
import '../Zod.ts';
import { hasAnyField } from './hasAnyField.ts';

export const updateServiceInputSchema = serviceSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .refine(hasAnyField, { message: 'Informe ao menos um campo para atualizar' })
  .openapi('UpdateServiceInput', {
    description:
      'Campos omitidos nao mudam; Ordens de Servico existentes mantem o preco congelado na inclusao',
  });

export type UpdateServiceInput = z.infer<typeof updateServiceInputSchema>;
