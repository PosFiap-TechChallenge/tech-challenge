import {
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
} from '../../../domain/aggregates/User.ts';
import { USER_ROLES } from '../../../domain/value-objects/UserRole.ts';
import { z } from '../Zod.ts';

export const registerUserInputSchema = z
  .object({
    name: z.string().trim().min(1).max(USER_NAME_MAX_LENGTH),
    email: z.email().max(USER_EMAIL_MAX_LENGTH),
    password: z
      .string()
      .min(USER_PASSWORD_MIN_LENGTH)
      .max(USER_PASSWORD_MAX_LENGTH)
      .openapi({ description: 'Deve conter letras e numeros' }),
    role: z.enum(USER_ROLES),
  })
  .openapi('RegisterUserInput');

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;
