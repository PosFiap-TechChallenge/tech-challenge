import { beforeEach, describe, expect, it } from 'vitest';
import { makeServiceOrderIn, ORDER_ID } from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { RejectBudgetUseCase } from './RejectBudgetUseCase.ts';

describe('RejectBudgetUseCase', () => {
  const { orderRepository, eventPublisher, runner, reset } = makeRunnerKit();
  const useCase = new RejectBudgetUseCase(runner);
  const id = ORDER_ID;

  beforeEach(reset);

  it('registra a rejeicao e devolve a OS ao diagnostico', async () => {
    orderRepository.findById.mockImplementation(async () =>
      makeServiceOrderIn('AWAITING_APPROVAL'),
    );

    const output = await useCase.execute(id);

    expect(output.status).toBe('IN_DIAGNOSIS');
    expect(output.budget?.status).toBe('REJECTED');
    expect(orderRepository.update).toHaveBeenCalledOnce();
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
  });

  it('rejeita quando a OS nao aguarda aprovacao', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('IN_EXECUTION'));

    await expect(useCase.execute(id)).rejects.toMatchObject({ code: 'INVALID_ORDER_TRANSITION' });
    expect(orderRepository.update).not.toHaveBeenCalled();
  });
});
