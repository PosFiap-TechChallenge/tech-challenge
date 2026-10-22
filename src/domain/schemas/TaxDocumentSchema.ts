import { z } from 'zod';
import { TaxDocument } from '../value-objects/TaxDocument.ts';

/** CPF ou CNPJ com ou sem mascara; o valor validado sai sem mascara. */
export function taxDocumentSchema() {
  return z
    .string()
    .refine(TaxDocument.isValid, { message: 'CPF ou CNPJ invalido' })
    .transform((raw) => TaxDocument.create(raw).value);
}
