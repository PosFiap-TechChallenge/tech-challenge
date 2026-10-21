import { beforeEach, describe, expect, it } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { makePart, PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import { makePartRepositoryMock } from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { ListStockMovementsUseCase } from './ListStockMovementsUseCase.ts';

describe('ListStockMovementsUseCase', () => {
  const partRepository = makePartRepositoryMock();
  const useCase = new ListStockMovementsUseCase(partRepository);
  const id = PART_ID as PartId;

  beforeEach(() => {
    partRepository.findById.mockReset();
    partRepository.listMovements.mockReset();
  });

  it('retorna o historico paginado com datas em ISO', async () => {
    partRepository.findById.mockResolvedValue(makePart());
    partRepository.listMovements.mockResolvedValue({
      items: [
        {
          id: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
          partId: PART_ID,
          type: 'ADJUSTMENT',
          quantity: -2,
          balanceAfter: 8,
          reservedAfter: 0,
          reason: 'Inventario',
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        },
      ],
      total: 1,
    });

    const output = await useCase.execute(id, { page: 1, pageSize: 20 });

    expect(partRepository.listMovements).toHaveBeenCalledWith(id, { page: 1, pageSize: 20 });
    expect(output.items[0]).toMatchObject({
      type: 'ADJUSTMENT',
      quantity: -2,
      createdAt: '2026-02-01T00:00:00.000Z',
    });
    expect(output.totalPages).toBe(1);
  });

  it('rejeita com NotFoundError quando a peca nao existe', async () => {
    partRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(id, { page: 1, pageSize: 20 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(partRepository.listMovements).not.toHaveBeenCalled();
  });
});
