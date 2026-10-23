import { beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { Part } from '../../../domain/aggregates/Part.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makePart } from '../../../domain/test/mocks/PartMock.ts';
import {
  makeEventPublisherMock,
  makePartRepositoryMock,
} from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { ConcurrentUpdateError, NotFoundError } from '../../exceptions/AppError.ts';
import { ConsumePartsUseCase } from './ConsumePartsUseCase.ts';
import { PartCommandRunner } from './PartCommandRunner.ts';
import { ReleasePartReservationsUseCase } from './ReleasePartReservationsUseCase.ts';
import { ReservePartsUseCase } from './ReservePartsUseCase.ts';

const FILTER_ID = '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';
const OIL_ID = '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b';
const UNKNOWN_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

describe('operacoes de estoque em lote', () => {
  const partRepository = makePartRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const runner = new PartCommandRunner(partRepository, eventPublisher);
  const reserve = new ReservePartsUseCase(runner);
  const consume = new ConsumePartsUseCase(runner);
  const release = new ReleasePartReservationsUseCase(runner);

  function stock(filter: Partial<Parameters<typeof makePart>[0]>, oil = {}): void {
    const parts: Record<string, () => Part> = {
      [FILTER_ID]: () => makePart({ id: FILTER_ID, code: 'FILTRO', ...filter }),
      [OIL_ID]: () =>
        makePart({ id: OIL_ID, code: 'OLEO', type: 'SUPPLY', unit: 'L', quantity: 20, ...oil }),
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

  describe('ReservePartsUseCase', () => {
    it('reserva todos os itens numa unica gravacao e devolve as pecas na ordem pedida', async () => {
      stock({ quantity: 10 });

      const output = await reserve.execute({
        items: [
          { partId: OIL_ID, quantity: 4.5 },
          { partId: FILTER_ID, quantity: 1 },
        ],
      });

      expect(partRepository.updateAll).toHaveBeenCalledOnce();
      expect(savedParts().map((part) => part.code)).toEqual(['OLEO', 'FILTRO']);
      expect(output.map((part) => [part.code, part.reserved])).toEqual([
        ['OLEO', 4.5],
        ['FILTRO', 1],
      ]);
      expect(eventPublisher.publish).toHaveBeenCalledTimes(2);
    });

    it('tudo ou nada: sem saldo em um item, nenhum e reservado e o erro aponta a peca', async () => {
      stock({ quantity: 1 });

      const result = reserve.execute({
        items: [
          { partId: OIL_ID, quantity: 4.5 },
          { partId: FILTER_ID, quantity: 2 },
        ],
      });

      await expect(result).rejects.toBeInstanceOf(DomainError);
      await expect(result).rejects.toMatchObject({
        code: 'INSUFFICIENT_STOCK',
        message: expect.stringMatching(/^Peca FILTRO: Saldo disponivel insuficiente/),
      });
      expect(partRepository.updateAll).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('rejeita o lote inteiro se uma peca nao existir', async () => {
      stock({ quantity: 10 });

      await expect(
        reserve.execute({
          items: [
            { partId: FILTER_ID, quantity: 1 },
            { partId: UNKNOWN_ID, quantity: 1 },
          ],
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(partRepository.updateAll).not.toHaveBeenCalled();
    });

    it('em conflito de versao, rele todas as pecas e repete o lote', async () => {
      stock({ quantity: 10 });
      partRepository.updateAll
        .mockRejectedValueOnce(new ConcurrentUpdateError('Peca'))
        .mockResolvedValueOnce(undefined);

      await reserve.execute({
        items: [
          { partId: FILTER_ID, quantity: 1 },
          { partId: OIL_ID, quantity: 1 },
        ],
      });

      expect(partRepository.findById).toHaveBeenCalledTimes(4);
      expect(partRepository.updateAll).toHaveBeenCalledTimes(2);
      expect(eventPublisher.publish).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['lote vazio', { items: [] }],
      [
        'peca repetida',
        {
          items: [
            { partId: FILTER_ID, quantity: 1 },
            { partId: FILTER_ID, quantity: 2 },
          ],
        },
      ],
      ['id invalido', { items: [{ partId: 'nao-e-uuid', quantity: 1 }] }],
      ['quantidade zero', { items: [{ partId: FILTER_ID, quantity: 0 }] }],
    ])('valida a entrada antes de tocar no banco: %s', async (_label, input) => {
      await expect(reserve.execute(input)).rejects.toBeInstanceOf(ZodError);
      expect(partRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('ConsumePartsUseCase', () => {
    it('baixa saldo e reserva de todos os itens e sinaliza estoque minimo', async () => {
      stock({ quantity: 4, reserved: 2, minimumStock: 2 }, { reserved: 4.5 });

      const output = await consume.execute({
        items: [
          { partId: FILTER_ID, quantity: 2 },
          { partId: OIL_ID, quantity: 4.5 },
        ],
      });

      expect(output.map((part) => [part.quantity, part.reserved, part.belowMinimum])).toEqual([
        [2, 0, true],
        [15.5, 0, false],
      ]);
      const published = eventPublisher.publish.mock.calls.flatMap(([events]) =>
        events.map((event) => event.name),
      );
      expect(published).toContain('MinimumStockReachedEvent');
    });

    it('nao consome nada se um item nao estiver reservado', async () => {
      stock({ reserved: 2 }, { reserved: 0 });

      await expect(
        consume.execute({
          items: [
            { partId: FILTER_ID, quantity: 2 },
            { partId: OIL_ID, quantity: 1 },
          ],
        }),
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_RESERVED_STOCK' });
      expect(partRepository.updateAll).not.toHaveBeenCalled();
    });
  });

  describe('ReleasePartReservationsUseCase', () => {
    it('devolve as reservas de todos os itens ao disponivel', async () => {
      stock({ quantity: 10, reserved: 3 }, { reserved: 4.5 });

      const output = await release.execute({
        items: [
          { partId: FILTER_ID, quantity: 3 },
          { partId: OIL_ID, quantity: 4.5 },
        ],
      });

      expect(output.map((part) => part.available)).toEqual([10, 20]);
      expect(savedParts().flatMap((part) => part.pendingMovements.map((m) => m.type))).toEqual([
        'RELEASE',
        'RELEASE',
      ]);
    });
  });
});
