import { userSchema } from '../../../domain/schemas/UserSchema.ts';
import type { z } from 'zod';
import '../Zod.ts';
import { timestampsOutputShape } from './TimestampsOutput.ts';

export const userOutputSchema = userSchema
  .omit({ passwordHash: true })
  .extend(timestampsOutputShape)
  .openapi('UserOutput');

export type UserOutput = z.infer<typeof userOutputSchema>;
