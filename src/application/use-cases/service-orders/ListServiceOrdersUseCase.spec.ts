import { beforeEach, describe, expect, it } from 'vitest';
import {
  makeServiceOrder,
  makeServiceOrderIn,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { makeServiceOrderRepositoryMock } from '../../../domain/test/mocks/ServiceOrderRepositoryMock.ts';
import { ListServiceOrdersUseCase } from './ListServiceOrdersUseCase.ts';

describe('ListServiceOrdersUseCase', () => {
  const orderRepository = makeServiceOrderRepositoryMock();
  const useCase = new ListServiceOrdersUseCase(orderRepository);

  beforeEach(() => {
    orderRepository.list.mockReset();
  });

  it('retorna resumos com o filtro e os metadados de paginacao', async () => {
    orderRepository.list.mockResolvedValue({
      items: [makeServiceOrder(), makeServiceOrderIn('AWAITING_APPROVAL')],
      total: 45,
    });

    const output = await useCase.execute({
      page: 2,
      pageSize: 20,
      status: 'AWAITING_APPROVAL',
      customerId: undefined,
    });

    expect(orderRepository.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      status: 'AWAITING_APPROVAL',
      customerId: undefined,
    });
    expect(output).toMatchObject({ page: 2, pageSize: 20, total: 45, totalPages: 3 });
    expect(output.items.map((item) => [item.status, item.total])).toEqual([
      ['RECEIVED', 0],
      ['AWAITING_APPROVAL', 171.8],
    ]);
    expect(output.items[0]).not.toHaveProperty('serviceItems');
  });

  it('retorna zero paginas quando nao ha OS', async () => {
    orderRepository.list.mockResolvedValue({ items: [], total: 0 });

    const output = await useCase.execute({ page: 1, pageSize: 20 });

    expect(output).toMatchObject({ items: [], total: 0, totalPages: 0 });
  });
});
