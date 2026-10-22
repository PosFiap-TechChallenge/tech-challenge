import { userSchema } from '../../../domain/schemas/UserSchema.ts';
import { z } from '../Zod.ts';

export const signInInputSchema = userSchema
  .pick({ email: true })
  .extend({ password: z.string().min(1).max(128) })
  .openapi('SignInInput');

export type SignInInput = z.infer<typeof signInInputSchema>;
