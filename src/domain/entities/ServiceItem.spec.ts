import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { ServiceItem } from './ServiceItem.ts';

const input = {
  serviceId: '5b4a3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
  name: ' Troca de oleo ',
  price: 120,
  estimatedMinutes: 45,
};
const START = new Date('2026-01-01T10:00:00.000Z');
const FINISH = new Date('2026-01-01T10:50:00.000Z');

describe('ServiceItem', () => {
  it('congela nome, preco e tempo estimado do catalogo', () => {
    const item = ServiceItem.create(input);

    expect(item.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(item.serviceId).toBe(input.serviceId);
    expect(item.name).toBe('Troca de oleo');
    expect(item.price.value).toBe(120);
    expect(item.estimatedMinutes).toBe(45);
    expect(item.startedAt).toBeNull();
    expect(item.finishedAt).toBeNull();
    expect(item.executionMinutes).toBeNull();
  });

  it.each([{ name: '' }, { price: -1 }, { estimatedMinutes: 0 }, { serviceId: 'nao-e-uuid' }])(
    'rejeita dados invalidos: %j',
    (override) => {
      expect(() => ServiceItem.create({ ...input, ...override })).toThrow(DomainError);
    },
  );

  it('mede o tempo de execucao entre o inicio e a conclusao, em minutos', () => {
    const item = ServiceItem.create(input);

    item.start(START);
    item.finish(FINISH);

    expect(item.startedAt).toEqual(START);
    expect(item.finishedAt).toEqual(FINISH);
    expect(item.executionMinutes).toBe(50);
  });

  it('nao conclui sem iniciar, nem inicia ou conclui duas vezes', () => {
    const item = ServiceItem.create(input);

    expect(() => item.finish(FINISH)).toThrow(DomainError);

    item.start(START);

    expect(() => item.start(START)).toThrow(DomainError);

    item.finish(FINISH);

    expect(() => item.finish(FINISH)).toThrow(DomainError);
  });

  it('nao conclui antes do inicio', () => {
    const item = ServiceItem.create(input);

    item.start(FINISH);

    expect(() => item.finish(START)).toThrow(DomainError);
  });

  it('reconstroi a partir dos dados persistidos sem alterar nada', () => {
    const item = ServiceItem.create(input);
    item.start(START);

    expect(ServiceItem.from(item.toData()).toData()).toEqual(item.toData());
  });
});
