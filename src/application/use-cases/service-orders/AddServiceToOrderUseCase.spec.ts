import { beforeEach, describe, expect, it } from 'vitest';
import { makeService, SERVICE_ID } from '../../../domain/test/mocks/ServiceMock.ts';
import { makeServiceRepositoryMock } from '../../../domain/test/mocks/ServiceRepositoryMock.ts';
import {
  makeServiceOrder,
  makeServiceOrderIn,
  ORDER_ID,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { AddServiceToOrderUseCase } from './AddServiceToOrderUseCase.ts';

describe('AddServiceToOrderUseCase', () => {
  const { orderRepository, eventPublisher, runner, reset } = makeRunnerKit();
  const serviceRepository = makeServiceRepositoryMock();
  const useCase = new AddServiceToOrderUseCase(runner, serviceRepository);
  const id = ORDER_ID;

  beforeEach(() => {
    reset();
    serviceRepository.findById.mockReset();
  });

  it('inclui o servico com o preco e o tempo do catalogo congelados', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    serviceRepository.findById.mockResolvedValue(makeService({ price: 150, estimatedMinutes: 30 }));

    const output = await useCase.execute(id, { serviceId: SERVICE_ID });

    expect(output.serviceItems).toMatchObject([
      { serviceId: SERVICE_ID, name: 'Troca de oleo', price: 150, estimatedMinutes: 30 },
    ]);
    expect(output.total).toBe(150);
    expect(orderRepository.update).toHaveBeenCalledOnce();
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
  });

  it('rejeita com NotFoundError quando o servico nao existe no catalogo', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(id, { serviceId: SERVICE_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(orderRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita servico repetido e OS que ja enviou o orcamento', async () => {
    serviceRepository.findById.mockResolvedValue(makeService());
    orderRepository.findById.mockImplementation(async () => {
      const order = makeServiceOrder();
      order.addService(makeService().toData());

      return order;
    });

    await expect(useCase.execute(id, { serviceId: SERVICE_ID })).rejects.toMatchObject({
      code: 'SERVICE_ALREADY_IN_ORDER',
    });

    orderRepository.findById.mockImplementation(async () =>
      makeServiceOrderIn('AWAITING_APPROVAL'),
    );

    await expect(useCase.execute(id, { serviceId: SERVICE_ID })).rejects.toMatchObject({
      code: 'ORDER_NOT_EDITABLE',
    });
    expect(orderRepository.update).not.toHaveBeenCalled();
  });
});
