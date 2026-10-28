import { beforeEach, describe, expect, it } from 'vitest';
import {
  FILTER_SOURCE,
  makeServiceOrderIn,
  ORDER_ID,
  SERVICE_SOURCE,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { SendBudgetUseCase } from './SendBudgetUseCase.ts';

describe('SendBudgetUseCase', () => {
  const { orderRepository, eventPublisher, runner, reset } = makeRunnerKit();
  const useCase = new SendBudgetUseCase(runner);
  const id = ORDER_ID;

  beforeEach(reset);

  it('gera o orcamento automatico com o total de servicos e pecas e aguarda aprovacao', async () => {
    orderRepository.findById.mockImplementation(async () => {
      const order = makeServiceOrderIn('IN_DIAGNOSIS');
      order.addService(SERVICE_SOURCE);
      order.addPart(FILTER_SOURCE, 2);

      return order;
    });

    const output = await useCase.execute(id);

    expect(output.status).toBe('AWAITING_APPROVAL');
    expect(output.budget).toMatchObject({ status: 'PENDING', total: 171.8, decidedAt: null });
    expect(orderRepository.update).toHaveBeenCalledOnce();
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
  });

  it('rejeita OS sem servicos e nao grava', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('IN_DIAGNOSIS'));

    await expect(useCase.execute(id)).rejects.toMatchObject({ code: 'ORDER_WITHOUT_SERVICES' });
    expect(orderRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita quando a OS nao esta em diagnostico', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('RECEIVED'));

    await expect(useCase.execute(id)).rejects.toMatchObject({ code: 'INVALID_ORDER_TRANSITION' });
  });
});
