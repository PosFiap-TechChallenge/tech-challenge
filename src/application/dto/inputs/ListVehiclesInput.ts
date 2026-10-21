import { vehicleSchema } from '../../../domain/schemas/VehicleSchema.ts';
import { z } from '../Zod.ts';

export const VEHICLES_DEFAULT_PAGE_SIZE = 20;
export const VEHICLES_MAX_PAGE_SIZE = 100;

export const listVehiclesInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(VEHICLES_MAX_PAGE_SIZE)
    .default(VEHICLES_DEFAULT_PAGE_SIZE),
  customerId: vehicleSchema.shape.customerId
    .optional()
    .openapi({ description: 'Filtra os veiculos de um cliente' }),
});

export type ListVehiclesInput = z.infer<typeof listVehiclesInputSchema>;
