import { beforeEach, describe, expect, it } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { makePart, PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import { makePartRepositoryMock } from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { NotFoundError, PartHasStockHistoryError } from '../../exceptions/AppError.ts';
import { DeletePartUseCase } from './DeletePartUseCase.ts';

describe('DeletePartUseCase', () => {
  const partRepository = makePartRepositoryMock();
  const useCase = new DeletePartUseCase(partRepository);
  const id = PART_ID as PartId;

  beforeEach(() => {
    partRepository.findById.mockReset();
    partRepository.hasStockHistory.mockReset();
    partRepository.delete.mockReset();
  });

  it('remove a peca que so tem o estoque inicial', async () => {
    partRepository.findById.mockResolvedValue(makePart());
    partRepository.hasStockHistory.mockResolvedValue(false);

    await useCase.execute(id);

    expect(partRepository.delete).toHaveBeenCalledWith(PART_ID);
  });

  it('rejeita com PartHasStockHistoryError quando ha movimentacoes', async () => {
    partRepository.findById.mockResolvedValue(makePart());
    partRepository.hasStockHistory.mockResolvedValue(true);

    await expect(useCase.execute(id)).rejects.toBeInstanceOf(PartHasStockHistoryError);
    expect(partRepository.delete).not.toHaveBeenCalled();
  });

  it('rejeita com NotFoundError quando a peca nao existe', async () => {
    partRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(id)).rejects.toBeInstanceOf(NotFoundError);
    expect(partRepository.delete).not.toHaveBeenCalled();
  });
});
