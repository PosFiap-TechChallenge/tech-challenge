import { beforeEach, describe, expect, it } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { makePart, PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import { makePartRepositoryMock } from '../../../domain/test/mocks/PartRepositoryMock.ts';
import {
  FILTER_SOURCE,
  makeServiceOrder,
  makeServiceOrderIn,
  ORDER_ID,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { AddPartToOrderUseCase } from './AddPartToOrderUseCase.ts';

describe('AddPartToOrderUseCase', () => {
  const { orderRepository, eventPublisher, runner, reset } = makeRunnerKit();
  const partRepository = makePartRepositoryMock();
  const useCase = new AddPartToOrderUseCase(runner, partRepository);
  const id = ORDER_ID;
  const input = { partId: PART_ID, quantity: 2 };

  beforeEach(() => {
    reset();
    partRepository.findById.mockReset();
    partRepository.updateAll.mockReset();
  });

  it('inclui a peca com o preco congelado depois de conferir o estoque disponivel', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    partRepository.findById.mockResolvedValue(makePart({ unitPrice: 30, quantity: 10 }));

    const output = await useCase.execute(id, input);

    expect(partRepository.findById).toHaveBeenCalledWith(PART_ID as PartId);
    expect(output.partItems).toMatchObject([
      { partId: PART_ID, code: 'FLT-OLEO-01', quantity: 2, unitPrice: 30, total: 60 },
    ]);
    expect(output.total).toBe(60);
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
  });

  it('nao reserva nem altera o estoque ao incluir', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10 }));

    await useCase.execute(id, input);

    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });

  it('bloqueia quando o estoque disponivel nao cobre a quantidade pedida', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10, reserved: 9 }));

    await expect(useCase.execute(id, input)).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    expect(orderRepository.update).not.toHaveBeenCalled();
  });

  it('confere o total ja pedido na OS: somar a mesma peca nao pode passar do disponivel', async () => {
    orderRepository.findById.mockImplementation(async () => {
      const order = makeServiceOrder();
      order.addPart(FILTER_SOURCE, 2);

      return order;
    });
    partRepository.findById.mockResolvedValue(makePart({ quantity: 3 }));

    await expect(useCase.execute(id, input)).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    await expect(useCase.execute(id, { ...input, quantity: 1 })).resolves.toMatchObject({
      partItems: [{ quantity: 3 }],
    });
  });

  it('rejeita com NotFoundError quando a peca nao existe', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    partRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(id, input)).rejects.toBeInstanceOf(NotFoundError);
    expect(orderRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita fracao em peca contada por unidade e OS que ja enviou o orcamento', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10 }));
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());

    await expect(useCase.execute(id, { ...input, quantity: 1.5 })).rejects.toMatchObject({
      code: 'FRACTIONAL_QUANTITY_NOT_ALLOWED',
    });

    orderRepository.findById.mockImplementation(async () =>
      makeServiceOrderIn('AWAITING_APPROVAL'),
    );

    await expect(useCase.execute(id, input)).rejects.toMatchObject({ code: 'ORDER_NOT_EDITABLE' });
  });
});
