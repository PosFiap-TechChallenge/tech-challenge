import type { z } from 'zod';
import { partSchema } from '../../../domain/schemas/PartSchema.ts';
import '../Zod.ts';
import { hasAnyField } from './hasAnyField.ts';

export const updatePartInputSchema = partSchema
  .pick({ code: true, name: true, type: true, unitPrice: true, minimumStock: true })
  .partial()
  .refine(hasAnyField, { message: 'Informe ao menos um campo para atualizar' })
  .openapi('UpdatePartInput', {
    description:
      'Campos omitidos nao mudam; a unidade de medida nao e editavel porque mudaria o significado do saldo',
  });

export type UpdatePartInput = z.infer<typeof updatePartInputSchema>;
