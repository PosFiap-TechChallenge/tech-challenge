import { z } from '../Zod.ts';
import { vehiclePlateSchema } from './VehicleFields.ts';

export const vehicleIdParamsSchema = z.object({
  id: z.uuid().openapi({ param: { name: 'id', in: 'path' } }),
});

export const vehiclePlateParamsSchema = z.object({
  plate: vehiclePlateSchema.openapi({
    param: { name: 'plate', in: 'path' },
    example: 'ABC1D23',
  }),
});
