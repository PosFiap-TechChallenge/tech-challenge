import { beforeEach, describe, expect, it } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makePart, PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import {
  makeEventPublisherMock,
  makePartRepositoryMock,
} from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { PartCommandRunner } from './PartCommandRunner.ts';
import { RegisterStockEntryUseCase } from './RegisterStockEntryUseCase.ts';

describe('RegisterStockEntryUseCase', () => {
  const partRepository = makePartRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const useCase = new RegisterStockEntryUseCase(
    new PartCommandRunner(partRepository, eventPublisher),
  );
  const id = PART_ID as PartId;

  beforeEach(() => {
    partRepository.findById.mockReset();
    partRepository.updateAll.mockReset();
    eventPublisher.publish.mockReset();
  });

  it('soma a entrada ao saldo e persiste a movimentacao ENTRY', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10 }));

    const output = await useCase.execute(id, { quantity: 5 });

    const savedPart = partRepository.updateAll.mock.calls[0]?.[0][0];

    expect(savedPart?.pendingMovements.map((movement) => movement.type)).toEqual(['ENTRY']);
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
    expect(output).toMatchObject({ quantity: 15, available: 15 });
  });

  it('rejeita com NotFoundError quando a peca nao existe', async () => {
    partRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(id, { quantity: 5 })).rejects.toBeInstanceOf(NotFoundError);
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });

  it('nao persiste entrada que ultrapassa o limite de saldo', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 1_000_000 }));

    await expect(useCase.execute(id, { quantity: 1 })).rejects.toBeInstanceOf(DomainError);
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });
});
