import { z } from 'zod';
import { LicensePlate } from '../value-objects/LicensePlate.ts';

/** Placa no padrao antigo ou Mercosul, com ou sem hifen; o valor validado sai em maiusculas e sem hifen. */
export function licensePlateSchema() {
  return z
    .string()
    .refine(LicensePlate.isValid, { message: 'Placa invalida' })
    .transform((raw) => LicensePlate.create(raw).value);
}
