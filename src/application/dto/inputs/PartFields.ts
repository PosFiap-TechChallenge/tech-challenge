import {
  PART_ADJUSTMENT_REASON_MAX_LENGTH,
  PART_CODE_MAX_LENGTH,
  PART_NAME_MAX_LENGTH,
} from '../../../domain/aggregates/Part.ts';
import { MEASUREMENT_UNITS } from '../../../domain/value-objects/MeasurementUnit.ts';
import { Money, MONEY_DECIMALS } from '../../../domain/value-objects/Money.ts';
import { PART_TYPES } from '../../../domain/value-objects/PartType.ts';
import {
  Quantity,
  QUANTITY_DECIMALS,
  QUANTITY_MAX,
} from '../../../domain/value-objects/Quantity.ts';
import { z } from '../Zod.ts';

export const partCodeSchema = z.string().trim().min(1).max(PART_CODE_MAX_LENGTH).openapi({
  description: 'Codigo interno da peca, unico (salvo em maiusculas)',
  example: 'FLT-OLEO-01',
});

export const partNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(PART_NAME_MAX_LENGTH)
  .openapi({ example: 'Filtro de oleo' });

export const partTypeSchema = z
  .enum(PART_TYPES)
  .openapi({ description: 'PART: peca aplicada ao veiculo; SUPPLY: insumo consumido no servico' });

export const measurementUnitSchema = z.enum(MEASUREMENT_UNITS).openapi({
  description: 'Unidade de medida. UN exige quantidades inteiras; as demais aceitam ate 3 casas',
});

export const unitPriceSchema = z
  .number()
  .refine(Money.isValid, {
    message: `Preco deve ser maior ou igual a 0, com ate ${MONEY_DECIMALS} casas decimais`,
  })
  .openapi({ description: 'Preco unitario em reais', example: 45.9 });

/** A regra "UN nao fraciona" depende da peca e e validada no dominio (422). */
export const partStockQuantitySchema = z.number().refine(Quantity.isValid, {
  message: `Quantidade deve estar entre 0 e ${QUANTITY_MAX}, com ate ${QUANTITY_DECIMALS} casas decimais`,
});

export const partMovementQuantitySchema = partStockQuantitySchema.refine((value) => value > 0, {
  message: 'Quantidade deve ser maior que zero',
});

export const partAdjustmentReasonSchema = z
  .string()
  .trim()
  .min(1)
  .max(PART_ADJUSTMENT_REASON_MAX_LENGTH)
  .openapi({ example: 'Inventario mensal: 2 unidades avariadas' });
