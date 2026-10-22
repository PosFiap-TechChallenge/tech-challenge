import { vehicleSchema } from '../../../domain/schemas/VehicleSchema.ts';
import '../Zod.ts';

export const vehicleIdParamsSchema = vehicleSchema.pick({ id: true });

export const vehiclePlateParamsSchema = vehicleSchema.pick({ plate: true });
