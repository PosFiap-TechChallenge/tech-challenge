import { DomainError } from '../errors/DomainError.ts';

export const TAX_DOCUMENT_TYPES = ['CPF', 'CNPJ'] as const;

export type TaxDocumentType = (typeof TAX_DOCUMENT_TYPES)[number];

export const TaxDocumentType = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
} as const satisfies Record<TaxDocumentType, TaxDocumentType>;

export const TAX_DOCUMENT_MAX_LENGTH = 14;

const MASK_CHARACTERS = /[\s./-]/g;
const CPF_PATTERN = /^\d{11}$/;
const CNPJ_PATTERN = /^[A-Z0-9]{12}\d{2}$/;
const CPF_FIRST_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_SECOND_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const ASCII_ZERO = 48;

/**
 * Valor numerico de cada caractere no calculo do digito verificador. Para
 * digitos coincide com o proprio digito; para letras segue a regra do CNPJ
 * alfanumerico da Receita Federal (codigo ASCII menos 48).
 */
function characterValue(character: string): number {
  return character.charCodeAt(0) - ASCII_ZERO;
}

function weightedSum(value: string, weights: readonly number[]): number {
  return weights.reduce(
    (sum, weight, index) => sum + characterValue(value.charAt(index)) * weight,
    0,
  );
}

function cpfCheckDigit(value: string, weights: readonly number[]): number {
  const remainder = (weightedSum(value, weights) * 10) % 11;

  return remainder === 10 ? 0 : remainder;
}

function cnpjCheckDigit(value: string, weights: readonly number[]): number {
  const remainder = weightedSum(value, weights) % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

function hasAllCharactersEqual(value: string): boolean {
  return value.split('').every((character) => character === value.charAt(0));
}

function isValidCpf(value: string): boolean {
  if (!CPF_PATTERN.test(value) || hasAllCharactersEqual(value)) {
    return false;
  }

  const firstDigit = cpfCheckDigit(value, CPF_FIRST_WEIGHTS);
  const secondDigit = cpfCheckDigit(value, CPF_SECOND_WEIGHTS);

  return value.endsWith(`${firstDigit}${secondDigit}`);
}

function isValidCnpj(value: string): boolean {
  if (!CNPJ_PATTERN.test(value) || hasAllCharactersEqual(value)) {
    return false;
  }

  const firstDigit = cnpjCheckDigit(value, CNPJ_FIRST_WEIGHTS);
  const secondDigit = cnpjCheckDigit(value, CNPJ_SECOND_WEIGHTS);

  return value.endsWith(`${firstDigit}${secondDigit}`);
}

function normalize(raw: string): string {
  return raw.replace(MASK_CHARACTERS, '').toUpperCase();
}

function detectType(value: string): TaxDocumentType | null {
  if (isValidCpf(value)) {
    return TaxDocumentType.CPF;
  }

  if (isValidCnpj(value)) {
    return TaxDocumentType.CNPJ;
  }

  return null;
}

/**
 * CPF (11 digitos) ou CNPJ (14 caracteres, numerico ou alfanumerico), sempre
 * armazenado sem mascara e com digitos verificadores validos.
 */
export class TaxDocument {
  private constructor(
    readonly value: string,
    readonly type: TaxDocumentType,
  ) {}

  static create(raw: string): TaxDocument {
    const value = normalize(raw);
    const type = detectType(value);

    if (!type) {
      throw new DomainError('CPF ou CNPJ invalido', 'INVALID_TAX_DOCUMENT');
    }

    return new TaxDocument(value, type);
  }

  static isValid(raw: string): boolean {
    return detectType(normalize(raw)) !== null;
  }

  equals(other: TaxDocument): boolean {
    return other.value === this.value;
  }
}
