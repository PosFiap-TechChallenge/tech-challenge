import { z } from '../Zod.ts';
import {
  vehicleBrandSchema,
  vehicleCustomerIdSchema,
  vehicleModelSchema,
  vehiclePlateSchema,
  vehicleYearSchema,
} from './VehicleFields.ts';

export const createVehicleInputSchema = z
  .object({
    plate: vehiclePlateSchema,
    brand: vehicleBrandSchema,
    model: vehicleModelSchema,
    year: vehicleYearSchema,
    customerId: vehicleCustomerIdSchema,
  })
  .openapi('CreateVehicleInput');

export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;
