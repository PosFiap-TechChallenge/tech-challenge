import { DomainError } from '../errors/DomainError.ts';
import { toScaledInteger } from '../shared/FixedPoint.ts';

export const QUANTITY_DECIMALS = 3;
export const QUANTITY_MAX = 1_000_000;

const SCALE = 10 ** QUANTITY_DECIMALS;

/**
 * Quantidade nao negativa com ate 3 casas decimais (ex.: 4,5 L de oleo).
 * Guardada em milesimos inteiros: somas e subtracoes de estoque sao exatas,
 * sem o erro de ponto flutuante de `number` (0.1 + 0.2 !== 0.3).
 */
export class Quantity {
  static readonly ZERO = new Quantity(0);

  private constructor(private readonly thousandths: number) {}

  static of(value: number, label = 'Quantidade'): Quantity {
    const thousandths = toScaledInteger(value, QUANTITY_DECIMALS);

    if (thousandths === null || thousandths < 0 || thousandths > QUANTITY_MAX * SCALE) {
      throw new DomainError(
        `${label} deve estar entre 0 e ${QUANTITY_MAX}, com ate ${QUANTITY_DECIMALS} casas decimais`,
        'INVALID_QUANTITY',
      );
    }

    return new Quantity(thousandths);
  }

  static isValid(value: number): boolean {
    const thousandths = toScaledInteger(value, QUANTITY_DECIMALS);

    return thousandths !== null && thousandths >= 0 && thousandths <= QUANTITY_MAX * SCALE;
  }

  get value(): number {
    return this.thousandths / SCALE;
  }

  get isZero(): boolean {
    return this.thousandths === 0;
  }

  get isWhole(): boolean {
    return this.thousandths % SCALE === 0;
  }

  plus(other: Quantity): Quantity {
    return new Quantity(this.thousandths + other.thousandths);
  }

  /** Quem chama garante `other <= this`: quantidade nunca fica negativa. */
  minus(other: Quantity): Quantity {
    if (other.thousandths > this.thousandths) {
      throw new RangeError('Subtracao resultaria em quantidade negativa');
    }

    return new Quantity(this.thousandths - other.thousandths);
  }

  /** Diferenca com sinal (`this - other`), exata ate a 3a casa. */
  differenceFrom(other: Quantity): number {
    return (this.thousandths - other.thousandths) / SCALE;
  }

  isGreaterThan(other: Quantity): boolean {
    return this.thousandths > other.thousandths;
  }

  isLessThan(other: Quantity): boolean {
    return this.thousandths < other.thousandths;
  }

  isAtMost(other: Quantity): boolean {
    return this.thousandths <= other.thousandths;
  }

  equals(other: Quantity): boolean {
    return this.thousandths === other.thousandths;
  }
}
