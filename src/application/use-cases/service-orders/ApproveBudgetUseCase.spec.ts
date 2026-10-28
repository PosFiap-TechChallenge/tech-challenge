import { beforeEach, describe, expect, it } from 'vitest';
import type { Part } from '../../../domain/aggregates/Part.ts';
import { makePart } from '../../../domain/test/mocks/PartMock.ts';
import { makePartRepositoryMock } from '../../../domain/test/mocks/PartRepositoryMock.ts';
import {
  FILTER_SOURCE,
  makeServiceOrder,
  makeServiceOrderIn,
  ORDER_ID,
  SERVICE_SOURCE,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { OrderStockService } from '../../services/OrderStockService.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { PartCommandRunner } from '../parts/PartCommandRunner.ts';
import { ApproveBudgetUseCase } from './ApproveBudgetUseCase.ts';

describe('ApproveBudgetUseCase', () => {
  const { unitOfWork, orderRepository, eventPublisher, runner, reset } = makeRunnerKit();
  const partRepository = makePartRepositoryMock();
  const orderStock = new OrderStockService(new PartCommandRunner(partRepository, eventPublisher));
  const useCase = new ApproveBudgetUseCase(runner, orderStock);
  const id = ORDER_ID;

  function awaitingApproval(): void {
    orderRepository.findById.mockImplementation(async () =>
      makeServiceOrderIn('AWAITING_APPROVAL'),
    );
  }

  function savedParts(): readonly Part[] {
    return partRepository.updateAll.mock.calls[0]?.[0] ?? [];
  }

  function stock(overrides: Partial<Parameters<typeof makePart>[0]> = {}): void {
    partRepository.findById.mockImplementation(async () =>
      makePart({ id: FILTER_SOURCE.id, code: 'FLT-OLEO-01', quantity: 10, ...overrides }),
    );
  }

  beforeEach(() => {
    reset();
    partRepository.findById.mockReset();
    partRepository.updateAll.mockReset();
  });

  it('aprova, inicia a execucao e reserva as pecas na mesma unidade de trabalho', async () => {
    awaitingApproval();
    stock();

    const output = await useCase.execute(id);

    expect(output.status).toBe('IN_EXECUTION');
    expect(output.budget?.status).toBe('APPROVED');
    expect(unitOfWork.run).toHaveBeenCalledOnce();
    expect(partRepository.updateAll).toHaveBeenCalledOnce();
    expect(savedParts()[0]?.reserved).toBe(2);
    expect(orderRepository.update).toHaveBeenCalledOnce();
  });

  it('publica os eventos da OS e da reserva so depois de gravar tudo', async () => {
    awaitingApproval();
    stock();

    await useCase.execute(id);

    const published = eventPublisher.publish.mock.calls.flatMap(([events]) =>
      events.map((event) => event.name),
    );

    expect(published).toEqual([
      'BudgetApprovedEvent',
      'ExecutionStartedEvent',
      'PartReservedEvent',
    ]);
  });

  it('sem saldo disponivel a aprovacao falha inteira: nada gravado, nada publicado', async () => {
    awaitingApproval();
    stock({ quantity: 1 });

    await expect(useCase.execute(id)).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      message: expect.stringContaining('FLT-OLEO-01'),
    });
    expect(partRepository.updateAll).not.toHaveBeenCalled();
    expect(orderRepository.update).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('desfaz tudo quando a gravacao da OS falha depois da reserva', async () => {
    awaitingApproval();
    stock();
    orderRepository.update.mockRejectedValue(new Error('conexao perdida'));

    await expect(useCase.execute(id)).rejects.toThrow('conexao perdida');
    expect(partRepository.updateAll).toHaveBeenCalledOnce();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('OS so com servicos nao mexe no estoque', async () => {
    orderRepository.findById.mockImplementation(async () => {
      const order = makeServiceOrder();
      order.addService(SERVICE_SOURCE);
      order.startDiagnosis();
      order.sendBudget();

      return order;
    });

    const output = await useCase.execute(id);

    expect(output.status).toBe('IN_EXECUTION');
    expect(partRepository.findById).not.toHaveBeenCalled();
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });

  it('rejeita quando a OS nao aguarda aprovacao, sem tocar no estoque', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('RECEIVED'));

    await expect(useCase.execute(id)).rejects.toMatchObject({ code: 'INVALID_ORDER_TRANSITION' });
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });
});
