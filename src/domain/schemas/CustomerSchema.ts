import { z } from 'zod';
import { emailSchema } from './EmailSchema.ts';
import { phoneSchema } from './PhoneSchema.ts';
import { taxDocumentSchema } from './TaxDocumentSchema.ts';

/** Espelha a tabela `customers`. */
export const customerSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  document: taxDocumentSchema().describe('CPF ou CNPJ; aceita mascara e e armazenado sem ela'),
  email: emailSchema().max(254).nullable(),
  phone: phoneSchema()
    .nullable()
    .describe('DDD + numero; aceita mascara e +55 e e armazenado so com digitos'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CustomerData = z.infer<typeof customerSchema>;
