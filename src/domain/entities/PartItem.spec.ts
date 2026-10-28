import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { PartItem } from './PartItem.ts';

const filter = {
  partId: '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  code: 'flt-01',
  name: 'Filtro de oleo',
  unit: 'UN',
  quantity: 2,
  unitPrice: 25.9,
} as const;

describe('PartItem', () => {
  it('congela codigo, nome, unidade e preco da peca e calcula o total da linha', () => {
    const item = PartItem.create(filter);

    expect(item.partId).toBe(filter.partId);
    expect(item.code).toBe('FLT-01');
    expect(item.quantity.value).toBe(2);
    expect(item.unitPrice.value).toBe(25.9);
    expect(item.total.value).toBe(51.8);
  });

  it('aceita fracao em insumos medidos por volume ou peso e arredonda o total ao centavo', () => {
    const item = PartItem.create({ ...filter, unit: 'L', quantity: 4.5, unitPrice: 45.9 });

    expect(item.total.value).toBe(206.55);
  });

  it.each([
    { quantity: 0 },
    { quantity: -1 },
    { quantity: 1.5 },
    { quantity: 1_000_001 },
    { unitPrice: -1 },
    { name: '' },
  ])('rejeita dados invalidos: %j', (override) => {
    expect(() => PartItem.create({ ...filter, ...override })).toThrow(DomainError);
  });

  it('soma quantidade ao item, respeitando a unidade', () => {
    const item = PartItem.create(filter);

    item.increaseBy(3);

    expect(item.quantity.value).toBe(5);
    expect(() => item.increaseBy(0.5)).toThrow(DomainError);
    expect(() => item.increaseBy(0)).toThrow(DomainError);
    expect(item.quantity.value).toBe(5);
  });

  it('reconstroi a partir dos dados persistidos sem alterar nada', () => {
    const item = PartItem.create(filter);

    expect(PartItem.from(item.toData()).toData()).toEqual(item.toData());
  });
});
