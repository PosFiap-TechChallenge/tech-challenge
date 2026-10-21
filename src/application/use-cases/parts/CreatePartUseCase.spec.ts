import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makePart } from '../../../domain/test/mocks/PartMock.ts';
import {
  makeEventPublisherMock,
  makePartRepositoryMock,
} from '../../../domain/test/mocks/PartRepositoryMock.ts';
import type { CreatePartInput } from '../../dto/inputs/CreatePartInput.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { CreatePartUseCase } from './CreatePartUseCase.ts';

describe('CreatePartUseCase', () => {
  const partRepository = makePartRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const useCase = new CreatePartUseCase(partRepository, eventPublisher);

  const input: CreatePartInput = {
    code: 'flt-oleo-01',
    name: 'Filtro de oleo',
    type: 'PART',
    unit: 'UN',
    unitPrice: 25.9,
    initialQuantity: 10,
    minimumStock: 3,
  };

  beforeEach(() => {
    partRepository.findByCode.mockReset();
    partRepository.create.mockReset();
    eventPublisher.publish.mockReset();
  });

  it('cadastra a peca com o estoque inicial e a movimentacao INITIAL', async () => {
    partRepository.findByCode.mockResolvedValue(null);

    const output = await useCase.execute(input);

    const createdPart = partRepository.create.mock.calls[0]?.[0];

    expect(partRepository.findByCode).toHaveBeenCalledWith('FLT-OLEO-01');
    expect(createdPart?.id).toBe(output.id);
    expect(createdPart?.pendingMovements.map((movement) => movement.type)).toEqual(['INITIAL']);
    expect(output).toMatchObject({
      code: 'FLT-OLEO-01',
      quantity: 10,
      reserved: 0,
      available: 10,
      minimumStock: 3,
      belowMinimum: false,
    });
    expect(eventPublisher.publish.mock.calls[0]?.[0].map((event) => event.name)).toEqual([
      'InitialStockRegisteredEvent',
    ]);
  });

  it('rejeita com ConflictError quando o codigo ja existe', async () => {
    partRepository.findByCode.mockResolvedValue(makePart());

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
    expect(partRepository.create).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('valida o dominio antes de consultar o repositorio', async () => {
    await expect(useCase.execute({ ...input, initialQuantity: -1 })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(partRepository.findByCode).not.toHaveBeenCalled();
  });
});
