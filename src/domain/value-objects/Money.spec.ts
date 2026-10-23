import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { Money, MONEY_MAX } from './Money.ts';

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
});
