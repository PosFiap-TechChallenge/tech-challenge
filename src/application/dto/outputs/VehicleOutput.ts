import { vehicleSchema } from '../../../domain/schemas/VehicleSchema.ts';
import { z } from '../Zod.ts';
import { timestampsOutputShape } from './TimestampsOutput.ts';

export const vehicleOutputSchema = vehicleSchema
  .extend({
    ...timestampsOutputShape,
  })
  .openapi('VehicleOutput');

export type VehicleOutput = z.infer<typeof vehicleOutputSchema>;

export const vehiclePageOutputSchema = z
  .object({
    items: z.array(vehicleOutputSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi('VehiclePageOutput');

export type VehiclePageOutput = z.infer<typeof vehiclePageOutputSchema>;
