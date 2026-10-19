import { beforeEach, describe, expect, it } from 'vitest';
import { makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { ListCustomersUseCase } from './ListCustomersUseCase.ts';

describe('ListCustomersUseCase', () => {
  const customerRepository = makeCustomerRepositoryMock();
  const useCase = new ListCustomersUseCase(customerRepository);

  beforeEach(() => {
    customerRepository.list.mockReset();
  });

  it('retorna a pagina com metadados de paginacao', async () => {
    customerRepository.list.mockResolvedValue({ items: [makeCustomer()], total: 41 });

    const output = await useCase.execute({ page: 2, pageSize: 20 });

    expect(customerRepository.list).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    expect(output).toMatchObject({ page: 2, pageSize: 20, total: 41, totalPages: 3 });
    expect(output.items).toHaveLength(1);
  });

  it('retorna lista vazia com zero paginas quando nao ha clientes', async () => {
    customerRepository.list.mockResolvedValue({ items: [], total: 0 });

    const output = await useCase.execute({ page: 1, pageSize: 20 });

    expect(output).toEqual({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it('retorna itens vazios para pagina alem do total', async () => {
    customerRepository.list.mockResolvedValue({ items: [], total: 5 });

    const output = await useCase.execute({ page: 10, pageSize: 5 });

    expect(output.items).toEqual([]);
    expect(output.totalPages).toBe(1);
  });
});
