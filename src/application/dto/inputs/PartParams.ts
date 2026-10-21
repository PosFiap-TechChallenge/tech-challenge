import { z } from '../Zod.ts';

export const partIdParamsSchema = z.object({
  id: z.uuid().openapi({ param: { name: 'id', in: 'path' } }),
});
