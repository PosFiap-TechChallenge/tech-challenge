import { beforeEach, describe, expect, it } from 'vitest';
import type { Part } from '../../../domain/aggregates/Part.ts';
import { makePart } from '../../../domain/test/mocks/PartMock.ts';
import { makePartRepositoryMock } from '../../../domain/test/mocks/PartRepositoryMock.ts';
import {
  FILTER_SOURCE,
  makeServiceOrderIn,
  ORDER_ID,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { OrderStockService } from '../../services/OrderStockService.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { PartCommandRunner } from '../parts/PartCommandRunner.ts';
import { FinishServiceUseCase } from './FinishServiceUseCase.ts';

describe('FinishServiceUseCase', () => {
  const { unitOfWork, orderRepository, eventPublisher, runner, reset } = makeRunnerKit();
  const partRepository = makePartRepositoryMock();
  const orderStock = new OrderStockService(new PartCommandRunner(partRepository, eventPublisher));
  const useCase = new FinishServiceUseCase(runner, orderStock);
  const id = ORDER_ID;

  function inExecution(): void {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('IN_EXECUTION'));
  }

  function savedParts(): readonly Part[] {
    return partRepository.updateAll.mock.calls[0]?.[0] ?? [];
  }

  function reserved(overrides: Partial<Parameters<typeof makePart>[0]> = {}): void {
    partRepository.findById.mockImplementation(async () =>
      makePart({ id: FILTER_SOURCE.id, quantity: 10, reserved: 2, ...overrides }),
    );
  }

  beforeEach(() => {
    reset();
    partRepository.findById.mockReset();
    partRepository.updateAll.mockReset();
  });

  it('finaliza a OS e consome as pecas reservadas na mesma unidade de trabalho', async () => {
    inExecution();
    reserved();

    const output = await useCase.execute(id);

    const [part] = savedParts();

    expect(output.status).toBe('FINISHED');
    expect(output.serviceItems.every((item) => item.finishedAt !== null)).toBe(true);
    expect(unitOfWork.run).toHaveBeenCalledOnce();
    expect([part?.quantity, part?.reserved]).toEqual([8, 0]);
    expect(orderRepository.update).toHaveBeenCalledOnce();
  });

  it('publica os eventos da OS e do consumo depois de gravar', async () => {
    inExecution();
    reserved();

    await useCase.execute(id);

    const published = eventPublisher.publish.mock.calls.flatMap(([events]) =>
      events.map((event) => event.name),
    );

    expect(published).toEqual(['ServiceOrderFinishedEvent', 'PartConsumedEvent']);
  });

  it('falha inteira quando a reserva nao cobre o consumo: OS continua em execucao', async () => {
    inExecution();
    reserved({ reserved: 0 });

    await expect(useCase.execute(id)).rejects.toMatchObject({
      code: 'INSUFFICIENT_RESERVED_STOCK',
    });
    expect(orderRepository.update).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('rejeita quando a OS nao esta em execucao, sem tocar no estoque', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('FINISHED'));

    await expect(useCase.execute(id)).rejects.toMatchObject({ code: 'INVALID_ORDER_TRANSITION' });
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });
});
