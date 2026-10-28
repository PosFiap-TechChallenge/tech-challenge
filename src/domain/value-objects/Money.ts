import { DomainError } from '../errors/DomainError.ts';
import { toScaledInteger } from '../shared/FixedPoint.ts';
import { QUANTITY_DECIMALS, type Quantity } from './Quantity.ts';

export const MONEY_DECIMALS = 2;
export const MONEY_MAX = 1_000_000;

const SCALE = 10 ** MONEY_DECIMALS;
const QUANTITY_SCALE = BigInt(10 ** QUANTITY_DECIMALS);
const MAX_CENTS = MONEY_MAX * SCALE;

/** Valor monetario em reais, nao negativo, guardado em centavos inteiros. */
export class Money {
  static readonly ZERO = new Money(0);

  private constructor(private readonly amountInCents: number) {}

  static of(value: number, label = 'Valor'): Money {
    const cents = toScaledInteger(value, MONEY_DECIMALS);

    if (cents === null) {
      throw Money.invalid(label);
    }

    return Money.ofCents(cents, label);
  }

  private static ofCents(cents: number, label = 'Valor'): Money {
    if (cents < 0 || cents > MAX_CENTS) {
      throw Money.invalid(label);
    }

    return new Money(cents);
  }

  private static invalid(label: string): DomainError {
    return new DomainError(
      `${label} deve estar entre 0 e ${MONEY_MAX}, com ate ${MONEY_DECIMALS} casas decimais`,
      'INVALID_MONEY',
    );
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

  plus(other: Money): Money {
    return Money.ofCents(this.amountInCents + other.amountInCents);
  }

  /** Preco unitario x quantidade, arredondado ao centavo (meio centavo sobe). Em BigInt: o produto passa de 2^53. */
  multipliedBy(quantity: Quantity): Money {
    const thousandths = BigInt(toScaledInteger(quantity.value, QUANTITY_DECIMALS) ?? 0);
    const product = BigInt(this.amountInCents) * thousandths;
    const cents = (product + QUANTITY_SCALE / 2n) / QUANTITY_SCALE;

    return Money.ofCents(cents > BigInt(MAX_CENTS) ? MAX_CENTS + 1 : Number(cents));
  }

  equals(other: Money): boolean {
    return this.amountInCents === other.amountInCents;
  }
}
