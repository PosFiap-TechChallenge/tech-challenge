import { beforeEach, describe, expect, it } from 'vitest';
import type { Part } from '../../domain/aggregates/Part.ts';
import { DomainError } from '../../domain/errors/DomainError.ts';
import { makePart } from '../../domain/test/mocks/PartMock.ts';
import {
  makeEventPublisherMock,
  makePartRepositoryMock,
} from '../../domain/test/mocks/PartRepositoryMock.ts';
import {
  FILTER_SOURCE,
  makeServiceOrder,
  makeServiceOrderIn,
  OIL_SOURCE,
} from '../../domain/test/mocks/ServiceOrderMock.ts';
import { PartCommandRunner } from '../use-cases/parts/PartCommandRunner.ts';
import { OrderStockService } from './OrderStockService.ts';

describe('OrderStockService', () => {
  const partRepository = makePartRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const service = new OrderStockService(new PartCommandRunner(partRepository, eventPublisher));

  function stock(filter: Partial<Parameters<typeof makePart>[0]> = {}, oil = {}): void {
    const parts: Record<string, () => Part> = {
      [FILTER_SOURCE.id]: () => makePart({ id: FILTER_SOURCE.id, code: 'FLT-OLEO-01', ...filter }),
      [OIL_SOURCE.id]: () =>
        makePart({
          id: OIL_SOURCE.id,
          code: 'OLEO-5W30',
          type: 'SUPPLY',
          unit: 'L',
          quantity: 20,
          ...oil,
        }),
    };

    partRepository.findById.mockImplementation(async (id) => parts[id]?.() ?? null);
  }

  function savedParts(): readonly Part[] {
    return partRepository.updateAll.mock.calls[0]?.[0] ?? [];
  }

  beforeEach(() => {
    partRepository.findById.mockReset();
    partRepository.updateAll.mockReset();
    eventPublisher.publish.mockReset();
  });

  describe('reserve', () => {
    it('reserva todas as pecas da OS numa unica gravacao e devolve as pecas alteradas', async () => {
      stock({ quantity: 10 });
      const order = makeServiceOrder();
      order.addPart(FILTER_SOURCE, 2);
      order.addPart(OIL_SOURCE, 4.5);

      const parts = await service.reserve(order);

      expect(partRepository.updateAll).toHaveBeenCalledOnce();
      expect(savedParts().map((part) => [part.code, part.reserved])).toEqual([
        ['FLT-OLEO-01', 2],
        ['OLEO-5W30', 4.5],
      ]);
      expect(parts).toHaveLength(2);
    });

    it('nao publica eventos: quem controla a transacao publica depois do commit', async () => {
      stock({ quantity: 10 });

      const [part] = await service.reserve(makeServiceOrderIn('AWAITING_APPROVAL'));

      expect(eventPublisher.publish).not.toHaveBeenCalled();
      expect(part?.raisedEvents.map((event) => event.name)).toEqual(['PartReservedEvent']);
    });

    it('bloqueia, indicando a peca, quando falta saldo disponivel e nao grava nada', async () => {
      stock({ quantity: 1 });
      const order = makeServiceOrder();
      order.addPart(FILTER_SOURCE, 2);

      await expect(service.reserve(order)).rejects.toThrow(
        expect.objectContaining({
          code: 'INSUFFICIENT_STOCK',
          message: expect.stringContaining('Peca FLT-OLEO-01'),
        }),
      );
      expect(partRepository.updateAll).not.toHaveBeenCalled();
    });

    it('nao toca no estoque para OS sem pecas', async () => {
      const parts = await service.reserve(makeServiceOrder());

      expect(parts).toEqual([]);
      expect(partRepository.findById).not.toHaveBeenCalled();
      expect(partRepository.updateAll).not.toHaveBeenCalled();
    });
  });

  describe('consume', () => {
    it('baixa do saldo fisico e da reserva as pecas da OS', async () => {
      stock({ quantity: 10, reserved: 2 });
      const order = makeServiceOrder();
      order.addPart(FILTER_SOURCE, 2);

      await service.consume(order);

      const [part] = savedParts();

      expect(part?.quantity).toBe(8);
      expect(part?.reserved).toBe(0);
    });

    it('bloqueia quando a peca nao esta reservada', async () => {
      stock({ quantity: 10, reserved: 0 });
      const order = makeServiceOrder();
      order.addPart(FILTER_SOURCE, 2);

      await expect(service.consume(order)).rejects.toBeInstanceOf(DomainError);
      expect(partRepository.updateAll).not.toHaveBeenCalled();
    });
  });
});
