import { MEASUREMENT_UNITS } from '../../../domain/value-objects/MeasurementUnit.ts';
import { PART_TYPES } from '../../../domain/value-objects/PartType.ts';
import { STOCK_MOVEMENT_TYPES } from '../../../domain/value-objects/StockMovement.ts';
import { z } from '../Zod.ts';

export const partOutputSchema = z
  .object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    type: z.enum(PART_TYPES),
    unit: z.enum(MEASUREMENT_UNITS),
    unitPrice: z.number().openapi({ description: 'Preco unitario em reais' }),
    quantity: z.number().openapi({ description: 'Saldo fisico, na unidade da peca' }),
    reserved: z.number().openapi({ description: 'Reservado para orcamentos aprovados' }),
    available: z.number().openapi({ description: 'Saldo fisico menos o reservado' }),
    minimumStock: z.number(),
    belowMinimum: z.boolean().openapi({ description: 'Saldo fisico menor ou igual ao minimo' }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
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

export const stockMovementOutputSchema = z
  .object({
    id: z.uuid(),
    partId: z.uuid(),
    type: z.enum(STOCK_MOVEMENT_TYPES),
    quantity: z.number().openapi({
      description:
        'Quantidade movimentada; em ADJUSTMENT, a diferenca aplicada ao saldo (pode ser negativa)',
    }),
    balanceAfter: z.number(),
    reservedAfter: z.number(),
    reason: z.string().nullable(),
    createdAt: z.iso.datetime(),
  })
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
