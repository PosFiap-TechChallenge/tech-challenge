import { TAX_DOCUMENT_TYPES } from '../../../domain/value-objects/TaxDocument.ts';
import { z } from '../Zod.ts';

export const customerOutputSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    document: z.string().openapi({ description: 'CPF ou CNPJ sem mascara' }),
    documentType: z.enum(TAX_DOCUMENT_TYPES),
    email: z.email().nullable(),
    phone: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('CustomerOutput');

export type CustomerOutput = z.infer<typeof customerOutputSchema>;

export const customerPageOutputSchema = z
  .object({
    items: z.array(customerOutputSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi('CustomerPageOutput');

export type CustomerPageOutput = z.infer<typeof customerPageOutputSchema>;
