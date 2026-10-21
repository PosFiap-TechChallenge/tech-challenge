import { vehicleSchema } from '../../../domain/schemas/VehicleSchema.ts';
import type { z } from 'zod';
import '../Zod.ts';
import { hasAnyField } from './hasAnyField.ts';

export const updateVehicleInputSchema = vehicleSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .refine(hasAnyField, { message: 'Informe ao menos um campo para atualizar' })
  .openapi('UpdateVehicleInput', {
    description: 'Campos omitidos nao mudam; customerId transfere o veiculo para outro cliente',
  });

export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;
