import { describe, expect, it } from 'vitest';
import { makePart } from '../../../domain/test/mocks/PartMock.ts';
import { makePartRepositoryMock } from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { ListPartsUseCase } from './ListPartsUseCase.ts';

describe('ListPartsUseCase', () => {
  it('retorna a pagina de pecas com metadados de paginacao', async () => {
    const partRepository = makePartRepositoryMock();
    const useCase = new ListPartsUseCase(partRepository);
    partRepository.list.mockResolvedValue({ items: [makePart()], total: 3 });

    const output = await useCase.execute({ page: 2, pageSize: 1, belowMinimum: true });

    expect(partRepository.list).toHaveBeenCalledWith({ page: 2, pageSize: 1, belowMinimum: true });
    expect(output).toMatchObject({ page: 2, pageSize: 1, total: 3, totalPages: 3 });
    expect(output.items).toHaveLength(1);
  });
});
