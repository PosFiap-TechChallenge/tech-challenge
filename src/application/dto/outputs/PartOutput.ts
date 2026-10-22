import { partSchema } from '../../../domain/schemas/PartSchema.ts';
import { stockMovementSchema } from '../../../domain/schemas/StockMovementSchema.ts';
import { z } from '../Zod.ts';
import { timestampsOutputShape } from './TimestampsOutput.ts';

export const partOutputSchema = partSchema
  .omit({ version: true })
  .extend({
    available: z.number().openapi({ description: 'Saldo fisico menos o reservado' }),
    belowMinimum: z.boolean().openapi({ description: 'Saldo fisico menor ou igual ao minimo' }),
    ...timestampsOutputShape,
  })
  .openapi('PartOutput');

export type PartOutput = z.infer<typeof partOutputSchema>;

export const partPageOutputSchema = z
  .object({
    items: z.array(partOutputSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi('PartPageOutput');

export type PartPageOutput = z.infer<typeof partPageOutputSchema>;

export const stockMovementOutputSchema = stockMovementSchema
  .extend({ createdAt: timestampsOutputShape.createdAt })
  .openapi('StockMovementOutput');

export type StockMovementOutput = z.infer<typeof stockMovementOutputSchema>;

export const stockMovementPageOutputSchema = z
  .object({
    items: z.array(stockMovementOutputSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi('StockMovementPageOutput');

export type StockMovementPageOutput = z.infer<typeof stockMovementPageOutputSchema>;
