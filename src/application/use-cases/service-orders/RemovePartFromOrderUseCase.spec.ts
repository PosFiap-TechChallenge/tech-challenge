import { beforeEach, describe, expect, it } from 'vitest';
import {
  FILTER_SOURCE,
  makeServiceOrder,
  makeServiceOrderIn,
  ORDER_ID,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { required } from '../../../domain/test/mocks/required.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { RemovePartFromOrderUseCase } from './RemovePartFromOrderUseCase.ts';

describe('RemovePartFromOrderUseCase', () => {
  const { orderRepository, runner, reset } = makeRunnerKit();
  const useCase = new RemovePartFromOrderUseCase(runner);
  const id = ORDER_ID;

  beforeEach(reset);

  it('remove o item de peca e recalcula o total', async () => {
    const seeded = makeServiceOrder();
    seeded.addPart(FILTER_SOURCE, 2);
    const itemId = required(seeded.partItems[0]).id;
    orderRepository.findById.mockImplementation(async () =>
      makeServiceOrder({ partItems: seeded.toData().partItems }),
    );

    const output = await useCase.execute(id, itemId);

    expect(output.partItems).toHaveLength(0);
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
  });
});
