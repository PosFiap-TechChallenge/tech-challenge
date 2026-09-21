import { z } from './Zod.ts';

export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
    uptimeInSeconds: z.number().nonnegative(),
    timestamp: z.iso.datetime(),
  })
  .openapi('HealthResponse');

export type HealthResponse = z.infer<typeof healthResponseSchema>;
