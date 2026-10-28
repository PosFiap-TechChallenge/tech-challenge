import { beforeEach, describe, expect, it } from 'vitest';
import {
  makeServiceOrder,
  makeServiceOrderIn,
  ORDER_ID,
  SERVICE_SOURCE,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { required } from '../../../domain/test/mocks/required.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { RemoveServiceFromOrderUseCase } from './RemoveServiceFromOrderUseCase.ts';

describe('RemoveServiceFromOrderUseCase', () => {
  const { orderRepository, runner, reset } = makeRunnerKit();
  const useCase = new RemoveServiceFromOrderUseCase(runner);
  const id = ORDER_ID;

  beforeEach(reset);

  it('remove o item de servico e recalcula o total', async () => {
    const seeded = makeServiceOrder();
    seeded.addService(SERVICE_SOURCE);
    const itemId = required(seeded.serviceItems[0]).id;
    orderRepository.findById.mockImplementation(async () =>
      makeServiceOrder({ serviceItems: seeded.toData().serviceItems }),
    );

    const output = await useCase.execute(id, itemId);

    expect(output.serviceItems).toHaveLength(0);
    expect(output.total).toBe(0);
    expect(orderRepository.update).toHaveBeenCalledOnce();
  });

  it('rejeita item inexistente e OS que ja enviou o orcamento', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());

    await expect(useCase.execute(id, ORDER_ID)).rejects.toMatchObject({
      code: 'ORDER_ITEM_NOT_FOUND',
    });

    orderRepository.findById.mockImplementation(async () =>
      makeServiceOrderIn('AWAITING_APPROVAL'),
    );

    await expect(useCase.execute(id, ORDER_ID)).rejects.toMatchObject({
      code: 'ORDER_NOT_EDITABLE',
    });
    expect(orderRepository.update).not.toHaveBeenCalled();
  });
});
