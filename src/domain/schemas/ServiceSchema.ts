import { z } from 'zod';
import { moneySchema } from './MoneySchema.ts';

export const SERVICE_MAX_ESTIMATED_MINUTES = 10_080;

/** Espelha a tabela `services`. */
export const serviceSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120).describe('Nome unico no catalogo da oficina'),
  price: moneySchema().describe('Preco do servico em reais'),
  estimatedMinutes: z
    .number()
    .int()
    .min(1)
    .max(SERVICE_MAX_ESTIMATED_MINUTES)
    .describe('Tempo estimado de execucao, em minutos'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ServiceData = z.infer<typeof serviceSchema>;
