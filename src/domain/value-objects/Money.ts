import { DomainError } from '../errors/DomainError.ts';
import { toScaledInteger } from '../shared/FixedPoint.ts';

export const MONEY_DECIMALS = 2;
export const MONEY_MAX = 1_000_000;

const SCALE = 10 ** MONEY_DECIMALS;

/** Valor monetario em reais, nao negativo, guardado em centavos inteiros. */
export class Money {
  private constructor(private readonly amountInCents: number) {}

  static of(value: number, label = 'Valor'): Money {
    const cents = toScaledInteger(value, MONEY_DECIMALS);

    if (cents === null || cents < 0 || cents > MONEY_MAX * SCALE) {
      throw new DomainError(
        `${label} deve estar entre 0 e ${MONEY_MAX}, com ate ${MONEY_DECIMALS} casas decimais`,
        'INVALID_MONEY',
      );
    }

    return new Money(cents);
  }

  static isValid(value: number): boolean {
    const cents = toScaledInteger(value, MONEY_DECIMALS);

    return cents !== null && cents >= 0 && cents <= MONEY_MAX * SCALE;
  }

  get value(): number {
    return this.amountInCents / SCALE;
  }

  get cents(): number {
    return this.amountInCents;
  }

  equals(other: Money): boolean {
    return this.amountInCents === other.amountInCents;
  }
}
