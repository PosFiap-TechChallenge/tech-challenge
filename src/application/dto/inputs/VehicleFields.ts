import {
  VEHICLE_BRAND_MAX_LENGTH,
  VEHICLE_MIN_YEAR,
  VEHICLE_MODEL_MAX_LENGTH,
  Vehicle,
} from '../../../domain/aggregates/Vehicle.ts';
import { LicensePlate } from '../../../domain/value-objects/LicensePlate.ts';
import { z } from '../Zod.ts';

const MASKED_PLATE_LENGTH = 8;

export const vehiclePlateSchema = z
  .string()
  .trim()
  .min(1)
  .max(MASKED_PLATE_LENGTH)
  .refine(LicensePlate.isValid, { message: 'Placa invalida' })
  .openapi({
    description: 'Placa no padrao antigo ou Mercosul, com ou sem hifen',
    example: 'ABC1D23',
  });

export const vehicleBrandSchema = z
  .string()
  .trim()
  .min(1)
  .max(VEHICLE_BRAND_MAX_LENGTH)
  .openapi({ example: 'Fiat' });

export const vehicleModelSchema = z
  .string()
  .trim()
  .min(1)
  .max(VEHICLE_MODEL_MAX_LENGTH)
  .openapi({ example: 'Argo' });

export const vehicleYearSchema = z
  .number()
  .int()
  .refine(Vehicle.isValidYear, {
    message: `Ano deve estar entre ${VEHICLE_MIN_YEAR} e o proximo ano`,
  })
  .openapi({ example: 2022 });

export const vehicleCustomerIdSchema = z
  .uuid()
  .openapi({ description: 'Id do cliente proprietario do veiculo' });
