import { beforeEach, describe, expect, it } from 'vitest';
import { makeServiceOrderIn, ORDER_ID } from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { makeServiceOrderRepositoryMock } from '../../../domain/test/mocks/ServiceOrderRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { GetServiceOrderByIdUseCase } from './GetServiceOrderByIdUseCase.ts';

describe('GetServiceOrderByIdUseCase', () => {
  const orderRepository = makeServiceOrderRepositoryMock();
  const useCase = new GetServiceOrderByIdUseCase(orderRepository);

  beforeEach(() => {
    orderRepository.findById.mockReset();
  });

  it('detalha a OS com itens, orcamento e historico', async () => {
    orderRepository.findById.mockResolvedValue(makeServiceOrderIn('AWAITING_APPROVAL'));

    const output = await useCase.execute(ORDER_ID);

    expect(output).toMatchObject({
      id: ORDER_ID,
      status: 'AWAITING_APPROVAL',
      total: 171.8,
      budget: { status: 'PENDING', total: 171.8 },
    });
    expect(output.serviceItems).toHaveLength(1);
    expect(output.partItems).toMatchObject([{ code: 'FLT-OLEO-01', quantity: 2, total: 51.8 }]);
    expect(output.history.map((change) => change.status)).toEqual([
      'RECEIVED',
      'IN_DIAGNOSIS',
      'AWAITING_APPROVAL',
    ]);
  });

  it('rejeita com NotFoundError quando a OS nao existe', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(ORDER_ID)).rejects.toBeInstanceOf(NotFoundError);
  });
});
