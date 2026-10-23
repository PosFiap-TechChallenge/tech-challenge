import type { z } from '../Zod.ts';
import { partsPageInputSchema } from './ListPartsInput.ts';

export const listStockMovementsInputSchema = partsPageInputSchema;

export type ListStockMovementsInput = z.infer<typeof listStockMovementsInputSchema>;
