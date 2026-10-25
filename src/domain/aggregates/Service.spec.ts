import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { ServiceRegisteredEvent } from '../events/ServiceRegisteredEvent.ts';
import { makeService } from '../test/mocks/ServiceMock.ts';
import { Service } from './Service.ts';

const validInput = { name: '  Alinhamento  ', price: 89.9, estimatedMinutes: 60 };

describe('Service', () => {
  describe('create', () => {
    it('cria o servico com dados normalizados e gera id', () => {
      const service = Service.create(validInput);

      expect(service.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(service.name).toBe('Alinhamento');
      expect(service.price).toBe(89.9);
      expect(service.estimatedMinutes).toBe(60);
      expect(service.createdAt).toEqual(service.updatedAt);
    });

    it('registra o evento ServiceRegisteredEvent', () => {
      const service = Service.create(validInput);

      expect(service.raisedEvents).toHaveLength(1);
      expect(service.raisedEvents[0]).toBeInstanceOf(ServiceRegisteredEvent);
      expect(service.raisedEvents[0]?.payload).toEqual({
        serviceId: service.id,
        name: 'Alinhamento',
      });
    });

    it('aceita preco zero e os limites de duracao', () => {
      expect(Service.create({ ...validInput, price: 0 }).price).toBe(0);
      expect(Service.create({ ...validInput, estimatedMinutes: 1 }).estimatedMinutes).toBe(1);
      expect(Service.create({ ...validInput, estimatedMinutes: 10_080 }).estimatedMinutes).toBe(
        10_080,
      );
    });

    it.each(['', '   '])('rejeita nome vazio: "%s"', (name) => {
      expect(() => Service.create({ ...validInput, name })).toThrow(DomainError);
    });

    it('rejeita nome acima do limite', () => {
      expect(() => Service.create({ ...validInput, name: 'a'.repeat(121) })).toThrow(DomainError);
    });

    it.each([-1, 10.123, 1_000_001, Number.NaN])('rejeita preco invalido: %s', (price) => {
      expect(() => Service.create({ ...validInput, price })).toThrow(DomainError);
    });

    it.each([0, -5, 1.5, 10_081, Number.NaN])(
      'rejeita duracao invalida: %s',
      (estimatedMinutes) => {
        expect(() => Service.create({ ...validInput, estimatedMinutes })).toThrow(DomainError);
      },
    );
  });

  describe('from', () => {
    it('reconstroi o servico sem registrar eventos', () => {
      const service = makeService();

      expect(service.raisedEvents).toHaveLength(0);
      expect(service.name).toBe('Troca de oleo');
    });

    it('rejeita dados persistidos invalidos', () => {
      expect(() => makeService({ estimatedMinutes: 0 })).toThrow(DomainError);
    });
  });

  describe('update', () => {
    it('altera somente os campos informados e atualiza updatedAt', () => {
      const service = makeService();
      const previousUpdatedAt = service.updatedAt;

      service.update({ price: 150, estimatedMinutes: 50 });

      expect(service.price).toBe(150);
      expect(service.estimatedMinutes).toBe(50);
      expect(service.name).toBe('Troca de oleo');
      expect(service.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());
    });

    it('nao registra eventos ao atualizar', () => {
      const service = makeService();

      service.update({ name: 'Troca de oleo e filtro' });

      expect(service.raisedEvents).toHaveLength(0);
    });

    it('nao altera nada quando a validacao falha', () => {
      const service = makeService();

      expect(() => service.update({ name: 'Revisao', price: -1 })).toThrow(DomainError);
      expect(service.name).toBe('Troca de oleo');
      expect(service.price).toBe(120);
    });
  });

  describe('equals', () => {
    it('compara servicos pelo id e nao pelo nome', () => {
      const service = makeService();

      expect(service.equals(makeService({ name: 'Outro nome' }))).toBe(true);
      expect(service.equals(makeService({ id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d' }))).toBe(
        false,
      );
    });
  });
});
