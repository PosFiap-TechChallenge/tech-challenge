import { z } from '../Zod.ts';
import {
  vehicleBrandSchema,
  vehicleCustomerIdSchema,
  vehicleModelSchema,
  vehiclePlateSchema,
  vehicleYearSchema,
} from './VehicleFields.ts';

export const updateVehicleInputSchema = z
  .object({
    plate: vehiclePlateSchema.optional(),
    brand: vehicleBrandSchema.optional(),
    model: vehicleModelSchema.optional(),
    year: vehicleYearSchema.optional(),
    customerId: vehicleCustomerIdSchema
      .optional()
      .openapi({ description: 'Novo proprietario: transfere o veiculo para outro cliente' }),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para atualizar',
  })
  .openapi('UpdateVehicleInput');

export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;
