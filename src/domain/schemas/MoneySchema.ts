import { z } from 'zod';
import { Money, MONEY_DECIMALS, MONEY_MAX } from '../value-objects/Money.ts';

/** Valor em reais entre 0 e 1.000.000, com ate 2 casas decimais. */
export function moneySchema() {
  return z.number().refine(Money.isValid, {
    message: `Valor deve estar entre 0 e ${MONEY_MAX}, com ate ${MONEY_DECIMALS} casas decimais`,
  });
}
