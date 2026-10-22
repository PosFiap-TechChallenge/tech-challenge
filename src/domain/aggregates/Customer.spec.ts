import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { CustomerCreatedEvent } from '../events/CustomerCreatedEvent.ts';
import { makeCustomer } from '../test/mocks/CustomerMock.ts';
import { TaxDocumentType } from '../value-objects/TaxDocument.ts';
import { Customer } from './Customer.ts';

const validInput = {
  name: '  Joao da Silva  ',
  document: '529.982.247-25',
  email: ' Joao@Email.com ',
  phone: '(11) 98765-4321',
};

describe('Customer', () => {
  describe('create', () => {
    it('cria cliente com dados normalizados e gera id', () => {
      const customer = Customer.create(validInput);

      expect(customer.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(customer.name).toBe('Joao da Silva');
      expect(customer.document.value).toBe('52998224725');
      expect(customer.document.type).toBe(TaxDocumentType.CPF);
      expect(customer.email).toBe('joao@email.com');
      expect(customer.phone).toBe('11987654321');
      expect(customer.createdAt).toEqual(customer.updatedAt);
    });

    it('aceita cliente pessoa juridica com CNPJ', () => {
      const customer = Customer.create({ ...validInput, document: '11.222.333/0001-81' });

      expect(customer.document.type).toBe(TaxDocumentType.CNPJ);
    });

    it('aceita e-mail e telefone ausentes', () => {
      const customer = Customer.create({ ...validInput, email: null, phone: null });

      expect(customer.email).toBeNull();
      expect(customer.phone).toBeNull();
    });

    it('rejeita e-mail em branco: contato ausente deve ser null', () => {
      expect(() => Customer.create({ ...validInput, email: '   ' })).toThrow(
        expect.objectContaining({ code: 'INVALID_EMAIL' }),
      );
    });

    it('rejeita telefone em branco: contato ausente deve ser null', () => {
      expect(() => Customer.create({ ...validInput, phone: '' })).toThrow(
        expect.objectContaining({ code: 'INVALID_PHONE' }),
      );
    });

    it('remove o codigo do pais do telefone', () => {
      const customer = Customer.create({ ...validInput, phone: '+55 (11) 3333-4444' });

      expect(customer.phone).toBe('1133334444');
    });

    it('registra o evento CustomerCreatedEvent', () => {
      const customer = Customer.create(validInput);

      expect(customer.raisedEvents).toHaveLength(1);
      expect(customer.raisedEvents[0]).toBeInstanceOf(CustomerCreatedEvent);
      expect(customer.raisedEvents[0]?.payload).toEqual({
        customerId: customer.id,
        documentType: TaxDocumentType.CPF,
      });
    });

    it.each(['', '   '])('rejeita nome vazio: "%s"', (name) => {
      expect(() => Customer.create({ ...validInput, name })).toThrow(DomainError);
    });

    it('rejeita documento invalido', () => {
      expect(() => Customer.create({ ...validInput, document: '123.456.789-00' })).toThrow(
        DomainError,
      );
    });

    it.each(['joao', 'joao@', '@email.com', 'joao @email.com'])(
      'rejeita e-mail invalido: "%s"',
      (email) => {
        expect(() => Customer.create({ ...validInput, email })).toThrow(DomainError);
      },
    );

    it.each(['123', '119876543210', '(11) 9876-543A', '+1 202 555 0100'])(
      'rejeita telefone invalido: "%s"',
      (phone) => {
        expect(() => Customer.create({ ...validInput, phone })).toThrow(DomainError);
      },
    );
  });

  describe('from', () => {
    it('reconstroi o cliente sem registrar eventos', () => {
      const customer = makeCustomer();

      expect(customer.raisedEvents).toHaveLength(0);
      expect(customer.document.value).toBe('52998224725');
    });

    it('rejeita dados persistidos invalidos', () => {
      expect(() => makeCustomer({ document: '00000000000' })).toThrow(DomainError);
    });
  });

  describe('update', () => {
    it('altera somente os campos informados e atualiza updatedAt', () => {
      const customer = makeCustomer();
      const previousUpdatedAt = customer.updatedAt;

      customer.update({ name: 'Maria Souza' });

      expect(customer.name).toBe('Maria Souza');
      expect(customer.document.value).toBe('52998224725');
      expect(customer.email).toBe('joao@email.com');
      expect(customer.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());
    });

    it('permite trocar o documento por outro valido', () => {
      const customer = makeCustomer();

      customer.update({ document: '11.222.333/0001-81' });

      expect(customer.document.value).toBe('11222333000181');
      expect(customer.document.type).toBe(TaxDocumentType.CNPJ);
    });

    it('limpa e-mail e telefone quando recebe null', () => {
      const customer = makeCustomer();

      customer.update({ email: null, phone: null });

      expect(customer.email).toBeNull();
      expect(customer.phone).toBeNull();
    });

    it('nao altera nada quando a validacao falha', () => {
      const customer = makeCustomer();

      expect(() => customer.update({ name: 'Maria', email: 'invalido' })).toThrow(DomainError);
      expect(customer.name).toBe('Joao da Silva');
      expect(customer.email).toBe('joao@email.com');
    });
  });
});
