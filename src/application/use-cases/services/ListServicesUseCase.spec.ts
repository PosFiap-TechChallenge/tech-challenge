import { beforeEach, describe, expect, it } from 'vitest';
import { makeService } from '../../../domain/test/mocks/ServiceMock.ts';
import { makeServiceRepositoryMock } from '../../../domain/test/mocks/ServiceRepositoryMock.ts';
import { ListServicesUseCase } from './ListServicesUseCase.ts';

describe('ListServicesUseCase', () => {
  const serviceRepository = makeServiceRepositoryMock();
  const useCase = new ListServicesUseCase(serviceRepository);

  beforeEach(() => {
    serviceRepository.list.mockReset();
  });

  it('retorna a pagina com os metadados de paginacao', async () => {
    serviceRepository.list.mockResolvedValue({ items: [makeService()], total: 45 });

    const output = await useCase.execute({ page: 2, pageSize: 20 });

    expect(serviceRepository.list).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    expect(output).toMatchObject({ page: 2, pageSize: 20, total: 45, totalPages: 3 });
    expect(output.items).toHaveLength(1);
  });

  it('retorna zero paginas quando o catalogo esta vazio', async () => {
    serviceRepository.list.mockResolvedValue({ items: [], total: 0 });

    const output = await useCase.execute({ page: 1, pageSize: 20 });

    expect(output).toMatchObject({ items: [], total: 0, totalPages: 0 });
  });
});
