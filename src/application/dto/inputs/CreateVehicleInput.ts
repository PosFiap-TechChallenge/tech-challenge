import { vehicleSchema } from '../../../domain/schemas/VehicleSchema.ts';
import type { z } from 'zod';
import '../Zod.ts';

export const createVehicleInputSchema = vehicleSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .openapi('CreateVehicleInput');

export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;
