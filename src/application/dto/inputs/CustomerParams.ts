import { customerSchema } from '../../../domain/schemas/CustomerSchema.ts';
import '../Zod.ts';

export const customerIdParamsSchema = customerSchema.pick({ id: true });

export const customerDocumentParamsSchema = customerSchema.pick({ document: true });
