import { z } from '../Zod.ts';

export const executionTimeOutputSchema = z
  .object({
    finishedOrders: z.number().int().nonnegative(),
    averageExecutionMinutes: z.number().nullable().openapi({
      description: 'Media, em minutos, do inicio a conclusao da execucao; nulo sem OS concluidas',
    }),
    byService: z.array(
      z.object({
        serviceId: z.uuid(),
        name: z.string(),
        finishedCount: z.number().int().positive(),
        averageEstimatedMinutes: z.number(),
        averageExecutionMinutes: z.number(),
      }),
    ),
  })
  .openapi('ExecutionTimeOutput');

export type ExecutionTimeOutput = z.infer<typeof executionTimeOutputSchema>;
