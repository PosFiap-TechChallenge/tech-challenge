import { beforeEach, describe, expect, it } from 'vitest';
import { makeServiceOrderRepositoryMock } from '../../../domain/test/mocks/ServiceOrderRepositoryMock.ts';
import { GetAverageExecutionTimeUseCase } from './GetAverageExecutionTimeUseCase.ts';

describe('GetAverageExecutionTimeUseCase', () => {
  const orderRepository = makeServiceOrderRepositoryMock();
  const useCase = new GetAverageExecutionTimeUseCase(orderRepository);

  beforeEach(() => {
    orderRepository.executionTimeStats.mockReset();
  });

  it('devolve a media geral e por servico, arredondada a 2 casas', async () => {
    orderRepository.executionTimeStats.mockResolvedValue({
      finishedOrders: 3,
      averageExecutionMinutes: 52.3333333,
      byService: [
        {
          serviceId: '5b4a3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
          name: 'Troca de oleo',
          finishedCount: 3,
          averageEstimatedMinutes: 45,
          averageExecutionMinutes: 52.3333333,
        },
      ],
    });

    const output = await useCase.execute();

    expect(output).toEqual({
      finishedOrders: 3,
      averageExecutionMinutes: 52.33,
      byService: [
        {
          serviceId: '5b4a3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
          name: 'Troca de oleo',
          finishedCount: 3,
          averageEstimatedMinutes: 45,
          averageExecutionMinutes: 52.33,
        },
      ],
    });
  });

  it('devolve media nula quando nenhuma OS foi concluida', async () => {
    orderRepository.executionTimeStats.mockResolvedValue({
      finishedOrders: 0,
      averageExecutionMinutes: null,
      byService: [],
    });

    const output = await useCase.execute();

    expect(output).toEqual({ finishedOrders: 0, averageExecutionMinutes: null, byService: [] });
  });
});
