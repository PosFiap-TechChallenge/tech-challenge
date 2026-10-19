import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { TaxDocument, TaxDocumentType } from './TaxDocument.ts';

describe('TaxDocument', () => {
  describe('CPF', () => {
    it('aceita CPF valido sem mascara', () => {
      const document = TaxDocument.create('52998224725');

      expect(document.value).toBe('52998224725');
      expect(document.type).toBe(TaxDocumentType.CPF);
    });

    it('remove a mascara do CPF', () => {
      const document = TaxDocument.create(' 529.982.247-25 ');

      expect(document.value).toBe('52998224725');
    });

    it('rejeita CPF com digito verificador incorreto', () => {
      expect(() => TaxDocument.create('52998224726')).toThrow(DomainError);
    });

    it('rejeita CPF com todos os digitos iguais', () => {
      expect(() => TaxDocument.create('111.111.111-11')).toThrow(DomainError);
    });

    it('rejeita CPF com letras', () => {
      expect(() => TaxDocument.create('5299822472A')).toThrow(DomainError);
    });
  });

  describe('CNPJ', () => {
    it('aceita CNPJ numerico valido com mascara', () => {
      const document = TaxDocument.create('11.222.333/0001-81');

      expect(document.value).toBe('11222333000181');
      expect(document.type).toBe(TaxDocumentType.CNPJ);
    });

    it('aceita CNPJ alfanumerico valido e normaliza para maiusculas', () => {
      const document = TaxDocument.create('12.abc.345/01de-35');

      expect(document.value).toBe('12ABC34501DE35');
      expect(document.type).toBe(TaxDocumentType.CNPJ);
    });

    it('rejeita CNPJ com digito verificador incorreto', () => {
      expect(() => TaxDocument.create('11.222.333/0001-82')).toThrow(DomainError);
    });

    it('rejeita CNPJ com todos os caracteres iguais', () => {
      expect(() => TaxDocument.create('00000000000000')).toThrow(DomainError);
    });

    it('rejeita CNPJ alfanumerico com letra nos digitos verificadores', () => {
      expect(() => TaxDocument.create('12ABC34501DE3A')).toThrow(DomainError);
    });
  });

  it.each(['', '   ', '123', '529982247251', '1122233300018', '112223330001811'])(
    'rejeita documento com tamanho invalido: "%s"',
    (raw) => {
      expect(() => TaxDocument.create(raw)).toThrow(DomainError);
    },
  );

  it('rejeita caracteres especiais fora da mascara', () => {
    expect(() => TaxDocument.create('529#982#247#25')).toThrow(DomainError);
  });

  it('isValid indica validade sem lancar excecao', () => {
    expect(TaxDocument.isValid('529.982.247-25')).toBe(true);
    expect(TaxDocument.isValid('000.000.000-00')).toBe(false);
  });

  it('compara documentos pelo valor normalizado', () => {
    const masked = TaxDocument.create('529.982.247-25');
    const unmasked = TaxDocument.create('52998224725');

    expect(masked.equals(unmasked)).toBe(true);
    expect(masked.equals(TaxDocument.create('11222333000181'))).toBe(false);
  });
});
