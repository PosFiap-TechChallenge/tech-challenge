import { z } from 'zod';
import { licensePlateSchema } from './LicensePlateSchema.ts';

const VEHICLE_MIN_YEAR = 1900;

function isUpToNextYear(year: number): boolean {
  return year <= new Date().getFullYear() + 1;
}

/** Espelha a tabela `vehicles`. */
export const vehicleSchema = z.object({
  id: z.uuid(),
  plate: licensePlateSchema().describe(
    'Placa antiga ou Mercosul; aceita hifen e e armazenada sem ele',
  ),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(100),
  year: z
    .number()
    .int()
    .min(VEHICLE_MIN_YEAR)
    .refine(isUpToNextYear, { message: 'Ano do veiculo nao pode passar do proximo ano' }),
  customerId: z.uuid().describe('Cliente proprietario do veiculo'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VehicleData = z.infer<typeof vehicleSchema>;
