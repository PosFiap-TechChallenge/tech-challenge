import { z } from '../Zod.ts';
import { taxDocumentSchema } from './CustomerFields.ts';

export const customerIdParamsSchema = z.object({
  id: z.uuid().openapi({ param: { name: 'id', in: 'path' } }),
});

export const customerDocumentParamsSchema = z.object({
  document: taxDocumentSchema.openapi({
    param: { name: 'document', in: 'path' },
    example: '52998224725',
  }),
});
