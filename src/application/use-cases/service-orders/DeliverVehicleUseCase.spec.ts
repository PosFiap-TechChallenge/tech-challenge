import { beforeEach, describe, expect, it } from 'vitest';
import { makeServiceOrderIn, ORDER_ID } from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { DeliverVehicleUseCase } from './DeliverVehicleUseCase.ts';

describe('DeliverVehicleUseCase', () => {
  const { orderRepository, eventPublisher, runner, reset } = makeRunnerKit();
  const useCase = new DeliverVehicleUseCase(runner);
  const id = ORDER_ID;

  beforeEach(reset);

  it('entrega o veiculo de uma OS finalizada', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('FINISHED'));

    const output = await useCase.execute(id);

    expect(output.status).toBe('DELIVERED');
    expect(orderRepository.update).toHaveBeenCalledOnce();
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
  });

  it('rejeita quando a OS ainda nao foi finalizada', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('IN_EXECUTION'));

    await expect(useCase.execute(id)).rejects.toMatchObject({ code: 'INVALID_ORDER_TRANSITION' });
    expect(orderRepository.update).not.toHaveBeenCalled();
  });
});
