import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { Money, MONEY_MAX } from './Money.ts';
import { Quantity } from './Quantity.ts';

describe('Money', () => {
  it.each([
    [0, 0],
    [45.9, 4590],
    [0.01, 1],
    [MONEY_MAX, MONEY_MAX * 100],
  ])('aceita %s e guarda %s centavos', (value, cents) => {
    const money = Money.of(value);

    expect(money.value).toBe(value);
    expect(money.cents).toBe(cents);
    expect(Money.isValid(value)).toBe(true);
  });

  it.each([-0.01, 10.001, MONEY_MAX + 0.01, Number.NaN])('rejeita %s', (value) => {
    expect(() => Money.of(value)).toThrow(DomainError);
    expect(Money.isValid(value)).toBe(false);
  });

  it('converte valores com ruido de ponto flutuante para centavos exatos', () => {
    expect(Money.of(0.1 + 0.2).cents).toBe(30);
    expect(Money.of(19.99).cents).toBe(1999);
  });

  it('compara por valor', () => {
    expect(Money.of(10).equals(Money.of(10.0))).toBe(true);
    expect(Money.of(10).equals(Money.of(10.01))).toBe(false);
  });

  describe('plus', () => {
    it('soma em centavos, sem erro de ponto flutuante', () => {
      expect(Money.of(0.1).plus(Money.of(0.2)).cents).toBe(30);
      expect(Money.ZERO.plus(Money.of(19.99)).equals(Money.of(19.99))).toBe(true);
    });

    it('rejeita soma acima do limite', () => {
      expect(() => Money.of(MONEY_MAX).plus(Money.of(0.01))).toThrow(DomainError);
    });
  });

  describe('multipliedBy', () => {
    it.each([
      [25.9, 3, 77.7],
      [45.9, 4.5, 206.55],
      [10, 0.001, 0.01],
      [0.99, 0.5, 0.5],
    ])('%s x %s = %s', (price, quantity, expected) => {
      expect(Money.of(price).multipliedBy(Quantity.of(quantity)).value).toBe(expected);
    });

    it('arredonda meio centavo para cima', () => {
      expect(Money.of(0.05).multipliedBy(Quantity.of(0.1)).cents).toBe(1);
      expect(Money.of(0.01).multipliedBy(Quantity.of(0.4)).cents).toBe(0);
    });

    it('rejeita produto acima do limite sem perder precisao', () => {
      expect(() => Money.of(MONEY_MAX).multipliedBy(Quantity.of(1_000_000))).toThrow(DomainError);
    });
  });
});
