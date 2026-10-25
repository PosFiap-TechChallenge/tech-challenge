import { serviceSchema } from '../../../domain/schemas/ServiceSchema.ts';
import '../Zod.ts';

export const serviceIdParamsSchema = serviceSchema.pick({ id: true });
