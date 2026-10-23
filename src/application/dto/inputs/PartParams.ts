import { partSchema } from '../../../domain/schemas/PartSchema.ts';
import '../Zod.ts';

export const partIdParamsSchema = partSchema.pick({ id: true });
