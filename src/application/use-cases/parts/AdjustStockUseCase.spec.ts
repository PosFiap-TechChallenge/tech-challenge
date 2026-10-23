import { beforeEach, describe, expect, it } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makePart, PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import {
  makeEventPublisherMock,
  makePartRepositoryMock,
} from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { ConcurrentUpdateError, NotFoundError } from '../../exceptions/AppError.ts';
import { PartCommandRunner } from './PartCommandRunner.ts';
import { AdjustStockUseCase } from './AdjustStockUseCase.ts';

describe('AdjustStockUseCase', () => {
  const partRepository = makePartRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const useCase = new AdjustStockUseCase(new PartCommandRunner(partRepository, eventPublisher));
  const id = PART_ID as PartId;

  beforeEach(() => {
    partRepository.findById.mockReset();
    partRepository.updateAll.mockReset();
    eventPublisher.publish.mockReset();
  });

  it('substitui o saldo pela quantidade contada e persiste a movimentacao ADJUSTMENT', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10 }));

    const output = await useCase.execute(id, { quantity: 7, reason: 'Inventario' });

    const savedPart = partRepository.updateAll.mock.calls[0]?.[0][0];

    expect(savedPart?.pendingMovements.map((movement) => movement.type)).toEqual(['ADJUSTMENT']);
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
    expect(output).toMatchObject({ quantity: 7, available: 7 });
  });

  it('rejeita com NotFoundError quando a peca nao existe', async () => {
    partRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(id, { quantity: 7, reason: 'Inventario' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });

  it('nao persiste ajuste abaixo do reservado', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10, reserved: 4 }));

    await expect(useCase.execute(id, { quantity: 1, reason: 'Inventario' })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });
});

describe('AdjustStockUseCase - conflito de versao', () => {
  it('nao repete (a contagem precisa ser refeita) quando outra operacao alterou a peca', async () => {
    const partRepository = makePartRepositoryMock();
    const useCase = new AdjustStockUseCase(
      new PartCommandRunner(partRepository, makeEventPublisherMock()),
    );
    partRepository.findById.mockImplementation(async () => makePart());
    partRepository.updateAll
      .mockRejectedValueOnce(new ConcurrentUpdateError('Peca'))
      .mockResolvedValueOnce(undefined);

    await useCase
      .execute(PART_ID as PartId, { quantity: 5, reason: 'Inventario' })
      .catch(() => undefined);

    expect(partRepository.updateAll).toHaveBeenCalledOnce();
  });
});
