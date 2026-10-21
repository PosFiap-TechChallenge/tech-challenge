import { customerSchema } from '../../../domain/schemas/CustomerSchema.ts';
import { TAX_DOCUMENT_TYPES } from '../../../domain/value-objects/TaxDocument.ts';
import { z } from '../Zod.ts';
import { timestampsOutputShape } from './TimestampsOutput.ts';

export const customerOutputSchema = customerSchema
  .extend({
    documentType: z.enum(TAX_DOCUMENT_TYPES),
    ...timestampsOutputShape,
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
