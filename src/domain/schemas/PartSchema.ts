import { z } from 'zod';
import { MEASUREMENT_UNITS } from '../value-objects/MeasurementUnit.ts';
import { PART_TYPES } from '../value-objects/PartType.ts';
import { moneySchema } from './MoneySchema.ts';
import { quantitySchema } from './QuantitySchema.ts';

/** Espelha a tabela `parts`. Quantidades na unidade de medida da peca. */
export const partSchema = z.object({
  id: z.uuid(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .toUpperCase()
    .describe('Codigo interno unico; armazenado em maiusculas'),
  name: z.string().trim().min(1).max(120),
  type: z
    .enum(PART_TYPES)
    .describe('PART: peca aplicada ao veiculo; SUPPLY: insumo consumido no servico'),
  unit: z
    .enum(MEASUREMENT_UNITS)
    .describe('Unidade de medida. UN exige quantidades inteiras; as demais aceitam ate 3 casas'),
  unitPrice: moneySchema().describe('Preco unitario em reais'),
  quantity: quantitySchema().describe('Saldo fisico'),
  reserved: quantitySchema().describe('Parte do saldo fisico reservada para orcamentos aprovados'),
  minimumStock: quantitySchema().describe(
    'Saldo fisico menor ou igual a este valor sinaliza estoque minimo atingido',
  ),
  version: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PartData = z.infer<typeof partSchema>;
