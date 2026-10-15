import { USER_ROLES } from '../../../domain/value-objects/UserRole.ts';
import { z } from '../Zod.ts';

export const userOutputSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
    role: z.enum(USER_ROLES),
    active: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('UserOutput');

export type UserOutput = z.infer<typeof userOutputSchema>;
