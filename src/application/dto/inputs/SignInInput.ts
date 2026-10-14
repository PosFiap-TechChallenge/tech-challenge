import { z } from '../Zod.ts';

export const signInInputSchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(1).max(128),
  })
  .openapi('SignInInput');

export type SignInInput = z.infer<typeof signInInputSchema>;
