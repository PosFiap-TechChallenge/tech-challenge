import { z } from '../Zod.ts';

export const PARTS_DEFAULT_PAGE_SIZE = 20;
export const PARTS_MAX_PAGE_SIZE = 100;

/** Paginacao compartilhada pela listagem de pecas e pelo historico de movimentacoes. */
export const partsPageInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PARTS_MAX_PAGE_SIZE)
    .default(PARTS_DEFAULT_PAGE_SIZE),
});

export const listPartsInputSchema = partsPageInputSchema.extend({
  belowMinimum: z
    .stringbool()
    .optional()
    .openapi({ description: 'true lista apenas pecas com saldo fisico menor ou igual ao minimo' }),
});

export type ListPartsInput = z.infer<typeof listPartsInputSchema>;
