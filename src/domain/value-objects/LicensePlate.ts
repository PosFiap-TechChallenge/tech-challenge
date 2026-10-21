import { DomainError } from '../errors/DomainError.ts';

export const LICENSE_PLATE_LENGTH = 7;

const MASK_CHARACTERS = /[\s-]/g;
const LEGACY_PLATE_PATTERN = /^[A-Z]{3}\d{4}$/;
const MERCOSUL_PLATE_PATTERN = /^[A-Z]{3}\d[A-Z]\d{2}$/;

function normalize(raw: string): string {
  return raw.replace(MASK_CHARACTERS, '').toUpperCase();
}

function isValidFormat(value: string): boolean {
  return LEGACY_PLATE_PATTERN.test(value) || MERCOSUL_PLATE_PATTERN.test(value);
}

/**
 * Placa brasileira no padrao antigo (ABC1234) ou Mercosul (ABC1D23), sempre
 * armazenada em maiusculas e sem hifen.
 */
export class LicensePlate {
  private constructor(readonly value: string) {}

  static create(raw: string): LicensePlate {
    const value = normalize(raw);

    if (!isValidFormat(value)) {
      throw new DomainError('Placa em formato invalido', 'INVALID_LICENSE_PLATE');
    }

    return new LicensePlate(value);
  }

  static isValid(raw: string): boolean {
    return isValidFormat(normalize(raw));
  }

  equals(other: LicensePlate): boolean {
    return other.value === this.value;
  }
}
