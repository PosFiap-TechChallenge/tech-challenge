import { z } from '../Zod.ts';
import { userOutputSchema } from './UserOutput.ts';

export const authTokenOutputSchema = z
  .object({
    accessToken: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int().positive().openapi({ description: 'Validade em segundos' }),
    user: userOutputSchema,
  })
  .openapi('AuthTokenOutput');

export type AuthTokenOutput = z.infer<typeof authTokenOutputSchema>;
