import { taxDocumentSchema } from '../../../domain/schemas/TaxDocumentSchema.ts';
import { z } from '../Zod.ts';

/** Quem acompanha informa o CPF/CNPJ do dono da OS: o id sozinho nao basta. */
export const trackServiceOrderQuerySchema = z.object({
  document: taxDocumentSchema().openapi({
    description: 'CPF ou CNPJ do cliente dono da OS, com ou sem mascara',
  }),
});

export type TrackServiceOrderQuery = z.infer<typeof trackServiceOrderQuerySchema>;
