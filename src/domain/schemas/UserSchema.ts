import { z } from 'zod';
import { USER_ROLES } from '../value-objects/UserRole.ts';
import { emailSchema } from './EmailSchema.ts';

/** Espelha a tabela `users`. */
export const userSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  email: emailSchema().max(254),
  passwordHash: z.string().min(1),
  role: z.enum(USER_ROLES),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserData = z.infer<typeof userSchema>;
