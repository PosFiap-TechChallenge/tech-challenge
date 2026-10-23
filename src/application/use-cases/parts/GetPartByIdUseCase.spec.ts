import { beforeEach, describe, expect, it } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { makePart, PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import { makePartRepositoryMock } from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { GetPartByIdUseCase } from './GetPartByIdUseCase.ts';

describe('GetPartByIdUseCase', () => {
  const partRepository = makePartRepositoryMock();
  const useCase = new GetPartByIdUseCase(partRepository);

  beforeEach(() => {
    partRepository.findById.mockReset();
  });

  it('retorna a peca com saldos calculados', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10, reserved: 4 }));

    const output = await useCase.execute(PART_ID as PartId);

    expect(output).toMatchObject({ id: PART_ID, quantity: 10, reserved: 4, available: 6 });
  });

  it('rejeita com NotFoundError quando a peca nao existe', async () => {
    partRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(PART_ID as PartId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
