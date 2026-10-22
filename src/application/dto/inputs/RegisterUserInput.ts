import { passwordSchema } from '../../../domain/schemas/PasswordSchema.ts';
import { userSchema } from '../../../domain/schemas/UserSchema.ts';
import type { z } from 'zod';
import '../Zod.ts';

export const registerUserInputSchema = userSchema
  .pick({ name: true, email: true, role: true })
  .extend({ password: passwordSchema().describe('Deve conter letras e numeros') })
  .openapi('RegisterUserInput');

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;
