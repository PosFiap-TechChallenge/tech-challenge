import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { InitialStockRegisteredEvent } from '../events/InitialStockRegisteredEvent.ts';
import { MinimumStockReachedEvent } from '../events/MinimumStockReachedEvent.ts';
import { PartConsumedEvent } from '../events/PartConsumedEvent.ts';
import { PartReservationReleasedEvent } from '../events/PartReservationReleasedEvent.ts';
import { PartReservedEvent } from '../events/PartReservedEvent.ts';
import { StockAdjustedEvent } from '../events/StockAdjustedEvent.ts';
import { StockEntryRegisteredEvent } from '../events/StockEntryRegisteredEvent.ts';
import { makePart, PART_ID } from '../test/mocks/PartMock.ts';
import { QUANTITY_MAX } from '../value-objects/Quantity.ts';
import { type NewPartData, Part } from './Part.ts';

const validInput: NewPartData = {
  code: ' flt-oleo-01 ',
  name: '  Filtro de oleo  ',
  type: 'PART',
  unit: 'UN',
  unitPrice: 25.9,
  initialQuantity: 10,
  minimumStock: 3,
};

function expectDomainError(action: () => void, code: string): void {
  expect(action).toThrow(DomainError);

  try {
    action();
  } catch (error) {
    expect((error as DomainError).code).toBe(code);
  }
}

describe('Part', () => {
  describe('create', () => {
    it('cadastra a peca com dados normalizados e sem reserva', () => {
      const part = Part.create(validInput);

      expect(part.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(part.code).toBe('FLT-OLEO-01');
      expect(part.name).toBe('Filtro de oleo');
      expect(part.quantity).toBe(10);
      expect(part.reserved).toBe(0);
      expect(part.available).toBe(10);
      expect(part.minimumStock).toBe(3);
      expect(part.version).toBe(0);
    });

    it('registra o estoque inicial como evento e movimentacao', () => {
      const part = Part.create(validInput);

      expect(part.raisedEvents).toHaveLength(1);
      expect(part.raisedEvents[0]).toBeInstanceOf(InitialStockRegisteredEvent);
      expect(part.raisedEvents[0]?.payload).toEqual({
        partId: part.id,
        code: 'FLT-OLEO-01',
        quantity: 10,
        minimumStock: 3,
      });
      expect(part.pendingMovements).toEqual([
        expect.objectContaining({
          partId: part.id,
          type: 'INITIAL',
          quantity: 10,
          balanceAfter: 10,
          reservedAfter: 0,
          reason: null,
        }),
      ]);
    });

    it('aceita estoque inicial e minimo zerados', () => {
      const part = Part.create({ ...validInput, initialQuantity: 0, minimumStock: 0 });

      expect(part.quantity).toBe(0);
      expect(part.minimumStock).toBe(0);
    });

    it.each(['', '   ', 'a'.repeat(41)])('rejeita codigo invalido: "%s"', (code) => {
      expectDomainError(() => Part.create({ ...validInput, code }), 'INVALID_PART_CODE');
    });

    it.each(['', '   ', 'a'.repeat(121)])('rejeita nome invalido: "%s"', (name) => {
      expectDomainError(() => Part.create({ ...validInput, name }), 'INVALID_PART_TEXT');
    });

    it.each([-1, 1.0001, Number.NaN, QUANTITY_MAX + 1])(
      'rejeita estoque inicial ou minimo invalido: %s',
      (value) => {
        expectDomainError(
          () => Part.create({ ...validInput, initialQuantity: value }),
          'INVALID_QUANTITY',
        );
        expectDomainError(
          () => Part.create({ ...validInput, minimumStock: value }),
          'INVALID_QUANTITY',
        );
      },
    );
  });

  describe('registerEntry', () => {
    it('soma a entrada ao saldo fisico e registra evento e movimentacao', () => {
      const part = makePart({ quantity: 10, reserved: 4 });

      part.registerEntry(5);

      expect(part.quantity).toBe(15);
      expect(part.reserved).toBe(4);
      expect(part.available).toBe(11);
      expect(part.raisedEvents[0]).toBeInstanceOf(StockEntryRegisteredEvent);
      expect(part.raisedEvents[0]?.payload).toEqual({
        partId: PART_ID,
        quantity: 5,
        balanceAfter: 15,
      });
      expect(part.pendingMovements[0]).toMatchObject({
        type: 'ENTRY',
        quantity: 5,
        balanceAfter: 15,
        reservedAfter: 4,
      });
    });

    it.each([0, -1, 0.0001])(
      'rejeita quantidade nao positiva ou com mais de 3 casas: %s',
      (quantity) => {
        expectDomainError(() => makePart().registerEntry(quantity), 'INVALID_QUANTITY');
      },
    );

    it('rejeita entrada que ultrapassa o limite de saldo', () => {
      const part = makePart({ quantity: QUANTITY_MAX });

      expectDomainError(() => part.registerEntry(1), 'PART_QUANTITY_LIMIT_EXCEEDED');
      expect(part.quantity).toBe(QUANTITY_MAX);
    });
  });

  describe('adjust', () => {
    it('substitui o saldo pela quantidade contada e registra a diferenca com o motivo', () => {
      const part = makePart({ quantity: 10 });

      part.adjust(7, '  Inventario: 3 avariadas  ');

      expect(part.quantity).toBe(7);
      expect(part.raisedEvents[0]).toBeInstanceOf(StockAdjustedEvent);
      expect(part.raisedEvents[0]?.payload).toEqual({
        partId: PART_ID,
        difference: -3,
        balanceAfter: 7,
        reason: 'Inventario: 3 avariadas',
      });
      expect(part.pendingMovements[0]).toMatchObject({
        type: 'ADJUSTMENT',
        quantity: -3,
        balanceAfter: 7,
        reason: 'Inventario: 3 avariadas',
      });
    });

    it('aceita ajuste para cima', () => {
      const part = makePart({ quantity: 10 });

      part.adjust(12, 'Sobra no inventario');

      expect(part.quantity).toBe(12);
      expect(part.pendingMovements[0]?.quantity).toBe(2);
    });

    it('rejeita ajuste abaixo da quantidade reservada', () => {
      const part = makePart({ quantity: 10, reserved: 6 });

      expectDomainError(() => part.adjust(5, 'Inventario'), 'STOCK_ADJUSTMENT_BELOW_RESERVED');
      expect(part.quantity).toBe(10);
    });

    it('rejeita ajuste igual ao saldo atual', () => {
      expectDomainError(
        () => makePart({ quantity: 10 }).adjust(10, 'Inventario'),
        'STOCK_ADJUSTMENT_UNCHANGED',
      );
    });

    it.each(['', '   '])('exige motivo: "%s"', (reason) => {
      expectDomainError(() => makePart().adjust(5, reason), 'INVALID_PART_TEXT');
    });

    it('rejeita quantidade negativa', () => {
      expectDomainError(() => makePart().adjust(-1, 'Inventario'), 'INVALID_QUANTITY');
    });
  });

  describe('reserve', () => {
    it('reserva do saldo disponivel sem alterar o saldo fisico', () => {
      const part = makePart({ quantity: 10, reserved: 2 });

      part.reserve(5);

      expect(part.quantity).toBe(10);
      expect(part.reserved).toBe(7);
      expect(part.available).toBe(3);
      expect(part.raisedEvents[0]).toBeInstanceOf(PartReservedEvent);
      expect(part.raisedEvents[0]?.payload).toEqual({
        partId: PART_ID,
        quantity: 5,
        reservedAfter: 7,
      });
      expect(part.pendingMovements[0]).toMatchObject({
        type: 'RESERVATION',
        quantity: 5,
        balanceAfter: 10,
        reservedAfter: 7,
      });
    });

    it('permite reservar exatamente todo o disponivel', () => {
      const part = makePart({ quantity: 10, reserved: 4 });

      part.reserve(6);

      expect(part.available).toBe(0);
    });

    it('bloqueia reserva acima do saldo disponivel', () => {
      const part = makePart({ quantity: 10, reserved: 4 });

      expectDomainError(() => part.reserve(7), 'INSUFFICIENT_STOCK');
      expect(part.reserved).toBe(4);
      expect(part.raisedEvents).toHaveLength(0);
      expect(part.pendingMovements).toHaveLength(0);
    });

    it.each([0, -2, 1.0001])('rejeita quantidade invalida: %s', (quantity) => {
      expectDomainError(() => makePart().reserve(quantity), 'INVALID_QUANTITY');
    });
  });

  describe('consume', () => {
    it('baixa o saldo fisico e a reserva ao mesmo tempo', () => {
      const part = makePart({ quantity: 10, reserved: 4, minimumStock: 3 });

      part.consume(4);

      expect(part.quantity).toBe(6);
      expect(part.reserved).toBe(0);
      expect(part.available).toBe(6);
      expect(part.raisedEvents).toHaveLength(1);
      expect(part.raisedEvents[0]).toBeInstanceOf(PartConsumedEvent);
      expect(part.raisedEvents[0]?.payload).toEqual({
        partId: PART_ID,
        quantity: 4,
        balanceAfter: 6,
      });
      expect(part.pendingMovements[0]).toMatchObject({
        type: 'CONSUMPTION',
        quantity: 4,
        balanceAfter: 6,
        reservedAfter: 0,
      });
    });

    it.each([
      ['abaixo', 2],
      ['igual', 3],
    ])('sinaliza estoque minimo atingido quando o saldo fica %s do minimo', (_label, balance) => {
      const part = makePart({ quantity: 10, reserved: 10 - balance, minimumStock: 3 });

      part.consume(10 - balance);

      expect(part.isBelowMinimum).toBe(true);
      expect(part.raisedEvents.map((event) => event.name)).toEqual([
        'PartConsumedEvent',
        'MinimumStockReachedEvent',
      ]);
      expect(part.raisedEvents[1]).toBeInstanceOf(MinimumStockReachedEvent);
      expect(part.raisedEvents[1]?.payload).toEqual({
        partId: PART_ID,
        code: 'FLT-OLEO-01',
        balance,
        minimumStock: 3,
      });
    });

    it('nao consome mais do que o reservado', () => {
      const part = makePart({ quantity: 10, reserved: 2 });

      expectDomainError(() => part.consume(3), 'INSUFFICIENT_RESERVED_STOCK');
      expect(part.quantity).toBe(10);
      expect(part.reserved).toBe(2);
    });

    it.each([0, -1, 0.0005])('rejeita quantidade invalida: %s', (quantity) => {
      expectDomainError(() => makePart({ reserved: 5 }).consume(quantity), 'INVALID_QUANTITY');
    });
  });

  describe('release', () => {
    it('devolve a reserva ao disponivel sem alterar o saldo fisico', () => {
      const part = makePart({ quantity: 10, reserved: 6 });

      part.release(4);

      expect(part.quantity).toBe(10);
      expect(part.reserved).toBe(2);
      expect(part.available).toBe(8);
      expect(part.raisedEvents[0]).toBeInstanceOf(PartReservationReleasedEvent);
      expect(part.raisedEvents[0]?.payload).toEqual({
        partId: PART_ID,
        quantity: 4,
        reservedAfter: 2,
      });
      expect(part.pendingMovements[0]).toMatchObject({
        type: 'RELEASE',
        quantity: 4,
        balanceAfter: 10,
        reservedAfter: 2,
      });
    });

    it('nao libera mais do que o reservado', () => {
      const part = makePart({ quantity: 10, reserved: 2 });

      expectDomainError(() => part.release(3), 'INSUFFICIENT_RESERVED_STOCK');
      expect(part.reserved).toBe(2);
    });

    it.each([0, -1, 1.0001])('rejeita quantidade invalida: %s', (quantity) => {
      expectDomainError(() => makePart({ reserved: 5 }).release(quantity), 'INVALID_QUANTITY');
    });
  });

  describe('update', () => {
    it('altera codigo, nome e minimo sem tocar nos saldos, eventos ou movimentacoes', () => {
      const part = makePart({ quantity: 10, reserved: 2 });

      part.update({ code: ' flt-oleo-02 ', name: ' Filtro Tecfil ', minimumStock: 10 });

      expect(part.code).toBe('FLT-OLEO-02');
      expect(part.name).toBe('Filtro Tecfil');
      expect(part.minimumStock).toBe(10);
      expect(part.quantity).toBe(10);
      expect(part.reserved).toBe(2);
      expect(part.isBelowMinimum).toBe(true);
      expect(part.raisedEvents).toHaveLength(0);
      expect(part.pendingMovements).toHaveLength(0);
    });

    it('altera tipo e preco', () => {
      const part = makePart();

      part.update({ type: 'SUPPLY', unitPrice: 30 });

      expect(part.type).toBe('SUPPLY');
      expect(part.unitPrice).toBe(30);
    });

    it('nao oferece troca de unidade: o saldo seria reinterpretado', () => {
      const part = makePart({ unit: 'L', quantity: 4 });

      part.update({ unit: 'ML' } as never);

      expect(part.unit).toBe('L');
      expect(part.quantity).toBe(4);
    });

    it('mantem os campos nao informados', () => {
      const part = makePart();

      part.update({ minimumStock: 0 });

      expect(part.code).toBe('FLT-OLEO-01');
      expect(part.name).toBe('Filtro de oleo');
    });

    it('nao aplica nada se algum campo for invalido', () => {
      const part = makePart();

      expectDomainError(
        () => part.update({ name: 'Novo nome', minimumStock: -1 }),
        'INVALID_QUANTITY',
      );
      expect(part.name).toBe('Filtro de oleo');
    });
  });

  describe('tipo, unidade e preco', () => {
    it('cadastra insumo fracionado com preco', () => {
      const part = Part.create({
        ...validInput,
        type: 'SUPPLY',
        unit: 'L',
        unitPrice: 45.9,
        initialQuantity: 20.5,
        minimumStock: 4.25,
      });

      expect(part.type).toBe('SUPPLY');
      expect(part.unit).toBe('L');
      expect(part.unitPrice).toBe(45.9);
      expect(part.quantity).toBe(20.5);
      expect(part.minimumStock).toBe(4.25);
    });

    it.each(['INSUMO', ''])('rejeita tipo invalido: "%s"', (type) => {
      expectDomainError(
        () => Part.create({ ...validInput, type: type as never }),
        'INVALID_PART_TYPE',
      );
    });

    it.each(['LITRO', 'un', ''])('rejeita unidade invalida: "%s"', (unit) => {
      expectDomainError(
        () => Part.create({ ...validInput, unit: unit as never }),
        'INVALID_MEASUREMENT_UNIT',
      );
    });

    it.each([-0.01, 10.001, Number.POSITIVE_INFINITY])(
      'rejeita preco invalido: %s',
      (unitPrice) => {
        expectDomainError(() => Part.create({ ...validInput, unitPrice }), 'INVALID_MONEY');
      },
    );

    it('aceita preco zero', () => {
      expect(Part.create({ ...validInput, unitPrice: 0 }).unitPrice).toBe(0);
    });
  });

  describe('quantidades decimais', () => {
    const liters = (overrides = {}) => makePart({ unit: 'L', type: 'SUPPLY', ...overrides });

    it('item em UN nao aceita fracao em nenhuma operacao', () => {
      const part = makePart({ quantity: 10, reserved: 4 });

      expectDomainError(
        () => Part.create({ ...validInput, initialQuantity: 1.5 }),
        'FRACTIONAL_QUANTITY_NOT_ALLOWED',
      );
      expectDomainError(
        () => Part.create({ ...validInput, minimumStock: 0.5 }),
        'FRACTIONAL_QUANTITY_NOT_ALLOWED',
      );
      expectDomainError(() => part.registerEntry(2.5), 'FRACTIONAL_QUANTITY_NOT_ALLOWED');
      expectDomainError(() => part.adjust(9.5, 'Inventario'), 'FRACTIONAL_QUANTITY_NOT_ALLOWED');
      expectDomainError(() => part.reserve(1.5), 'FRACTIONAL_QUANTITY_NOT_ALLOWED');
      expectDomainError(() => part.consume(0.5), 'FRACTIONAL_QUANTITY_NOT_ALLOWED');
      expectDomainError(() => part.release(0.5), 'FRACTIONAL_QUANTITY_NOT_ALLOWED');
      expectDomainError(
        () => part.update({ minimumStock: 2.5 }),
        'FRACTIONAL_QUANTITY_NOT_ALLOWED',
      );
    });

    it('item em litros aceita ate 3 casas e rejeita a quarta', () => {
      const part = liters({ quantity: 10 });

      part.registerEntry(0.125);

      expect(part.quantity).toBe(10.125);
      expectDomainError(() => part.registerEntry(0.0001), 'INVALID_QUANTITY');
    });

    it('somas e subtracoes sao exatas, sem erro de ponto flutuante', () => {
      const part = liters({ quantity: 0 });

      part.registerEntry(0.1);
      part.registerEntry(0.2);

      expect(part.quantity).toBe(0.3);

      part.reserve(0.3);

      expect(part.available).toBe(0);

      part.consume(0.1);

      expect(part.quantity).toBe(0.2);
      expect(part.reserved).toBe(0.2);
    });

    it('reserva fracionada respeita o disponivel ate a 3a casa', () => {
      const part = liters({ quantity: 4.5, reserved: 0.25 });

      part.reserve(4.25);

      expect(part.available).toBe(0);
      expectDomainError(() => part.reserve(0.001), 'INSUFFICIENT_STOCK');
    });

    it('ajuste registra a diferenca exata', () => {
      const part = liters({ quantity: 10 });

      part.adjust(7.3, 'Evaporacao');

      expect(part.pendingMovements[0]).toMatchObject({ quantity: -2.7, balanceAfter: 7.3 });
      expect(part.raisedEvents[0]?.payload).toMatchObject({ difference: -2.7 });
    });

    it('estoque minimo fracionado e comparado com exatidao', () => {
      const part = liters({ quantity: 5, reserved: 0.75, minimumStock: 4.25 });

      part.consume(0.75);

      expect(part.quantity).toBe(4.25);
      expect(part.isBelowMinimum).toBe(true);
      expect(part.raisedEvents.map((event) => event.name)).toContain('MinimumStockReachedEvent');
    });
  });

  it('acumula uma movimentacao por operacao, na ordem em que ocorreram', () => {
    const part = Part.create(validInput);

    part.registerEntry(5);
    part.reserve(4);
    part.consume(4);

    expect(part.pendingMovements.map((movement) => movement.type)).toEqual([
      'INITIAL',
      'ENTRY',
      'RESERVATION',
      'CONSUMPTION',
    ]);
    expect(part.quantity).toBe(11);
    expect(part.reserved).toBe(0);
  });
});
