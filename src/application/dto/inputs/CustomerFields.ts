import { emailSchema } from '../../../domain/schemas/EmailSchema.ts';
import { phoneSchema } from '../../../domain/schemas/PhoneSchema.ts';
import { TaxDocument } from '../../../domain/value-objects/TaxDocument.ts';
import { z } from '../Zod.ts';

export const CUSTOMER_NAME_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;

const MASKED_CNPJ_LENGTH = 18;

export const customerNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(CUSTOMER_NAME_MAX_LENGTH)
  .openapi({ example: 'Joao da Silva' });

export const taxDocumentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MASKED_CNPJ_LENGTH)
  .refine(TaxDocument.isValid, { message: 'CPF ou CNPJ invalido' })
  .openapi({
    description: 'CPF ou CNPJ (numerico ou alfanumerico), com ou sem mascara',
    example: '529.982.247-25',
  });

export const customerEmailSchema = emailSchema()
  .max(EMAIL_MAX_LENGTH)
  .openapi({ format: 'email', example: 'joao@email.com' });

export const customerPhoneSchema = phoneSchema().openapi({
  description: 'DDD + numero, aceita +55 e mascara',
  example: '(11) 98765-4321',
});
