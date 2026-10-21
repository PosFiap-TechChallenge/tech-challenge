import { z } from '../Zod.ts';

export const vehicleOutputSchema = z
  .object({
    id: z.uuid(),
    plate: z.string().openapi({ description: 'Placa em maiusculas e sem hifen' }),
    brand: z.string(),
    model: z.string(),
    year: z.number().int(),
    customerId: z.uuid(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
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
