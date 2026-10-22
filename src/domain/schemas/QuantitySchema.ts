import { z } from 'zod';
import { Quantity, QUANTITY_DECIMALS, QUANTITY_MAX } from '../value-objects/Quantity.ts';

/**
 * Quantidade de estoque entre 0 e 1.000.000, com ate 3 casas decimais. A regra
 * "UN nao fraciona" depende da unidade da peca e e validada no agregado.
 */
export function quantitySchema() {
  return z.number().refine(Quantity.isValid, {
    message: `Quantidade deve estar entre 0 e ${QUANTITY_MAX}, com ate ${QUANTITY_DECIMALS} casas decimais`,
  });
}

/** Quantidade movimentada por uma operacao de estoque: precisa ser maior que zero. */
export function movementQuantitySchema() {
  return quantitySchema().refine((value) => value > 0, {
    message: 'Quantidade deve ser maior que zero',
  });
}
