import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { Quantity, QUANTITY_MAX } from './Quantity.ts';

describe('Quantity', () => {
  it.each([0, 1, 4.5, 0.001, 123.456, QUANTITY_MAX])('aceita %s', (value) => {
    expect(Quantity.of(value).value).toBe(value);
    expect(Quantity.isValid(value)).toBe(true);
  });

  it.each([-0.001, 0.0001, 1.2345, QUANTITY_MAX + 0.001, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita %s',
    (value) => {
      expect(() => Quantity.of(value)).toThrow(DomainError);
      expect(Quantity.isValid(value)).toBe(false);
    },
  );

  it('usa o rotulo informado na mensagem de erro', () => {
    expect(() => Quantity.of(-1, 'Estoque inicial')).toThrow(/^Estoque inicial/);
  });

  it('tolera o ruido de ponto flutuante na entrada', () => {
    expect(Quantity.of(0.1 + 0.2).value).toBe(0.3);
    expect(Quantity.of(1.005).value).toBe(1.005);
  });

  it('soma e subtrai sem erro de arredondamento', () => {
    const total = Quantity.of(0.1).plus(Quantity.of(0.2));

    expect(total.value).toBe(0.3);
    expect(total.minus(Quantity.of(0.1)).value).toBe(0.2);
  });

  it('nao permite subtracao que resulte negativa', () => {
    expect(() => Quantity.of(1).minus(Quantity.of(1.001))).toThrow(RangeError);
  });

  it('calcula a diferenca com sinal', () => {
    expect(Quantity.of(7.3).differenceFrom(Quantity.of(10))).toBe(-2.7);
    expect(Quantity.of(10).differenceFrom(Quantity.of(7.3))).toBe(2.7);
  });

  it('compara quantidades', () => {
    const small = Quantity.of(1.999);
    const big = Quantity.of(2);

    expect(big.isGreaterThan(small)).toBe(true);
    expect(small.isLessThan(big)).toBe(true);
    expect(small.isAtMost(small)).toBe(true);
    expect(big.isAtMost(small)).toBe(false);
    expect(Quantity.of(2).equals(big)).toBe(true);
  });

  it('identifica zero e quantidades inteiras', () => {
    expect(Quantity.ZERO.isZero).toBe(true);
    expect(Quantity.of(3).isWhole).toBe(true);
    expect(Quantity.of(3.5).isWhole).toBe(false);
  });
});
