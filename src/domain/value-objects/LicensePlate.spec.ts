import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { LicensePlate } from './LicensePlate.ts';

describe('LicensePlate', () => {
  it('aceita placa no padrao antigo', () => {
    expect(LicensePlate.create('ABC1234').value).toBe('ABC1234');
  });

  it('aceita placa no padrao Mercosul', () => {
    expect(LicensePlate.create('ABC1D23').value).toBe('ABC1D23');
  });

  it('normaliza caixa, espacos e hifen', () => {
    expect(LicensePlate.create(' abc-1234 ').value).toBe('ABC1234');
  });

  it.each([
    '',
    '   ',
    'ABC123',
    'ABC12345',
    'AB1234C',
    '1234ABC',
    'ABC-12@4',
    'ABCD123',
    'ABC1D2E',
  ])('rejeita placa invalida: "%s"', (raw) => {
    expect(() => LicensePlate.create(raw)).toThrow(DomainError);
    expect(LicensePlate.isValid(raw)).toBe(false);
  });

  it('compara placas pelo valor normalizado', () => {
    expect(LicensePlate.create('abc-1234').equals(LicensePlate.create('ABC1234'))).toBe(true);
    expect(LicensePlate.create('ABC1234').equals(LicensePlate.create('ABC1D23'))).toBe(false);
  });
});
