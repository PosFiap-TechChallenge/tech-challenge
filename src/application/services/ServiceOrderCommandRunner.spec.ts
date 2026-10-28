import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '../../domain/errors/DomainError.ts';
import { makeEventPublisherMock } from '../../domain/test/mocks/PartRepositoryMock.ts';
import { makePart } from '../../domain/test/mocks/PartMock.ts';
import { makeServiceOrder, ORDER_ID } from '../../domain/test/mocks/ServiceOrderMock.ts';
import {
  makeServiceOrderRepositoryMock,
  makeUnitOfWorkMock,
} from '../../domain/test/mocks/ServiceOrderRepositoryMock.ts';
import { ConcurrentUpdateError, NotFoundError } from '../exceptions/AppError.ts';
import {
  ORDER_COMMAND_MAX_ATTEMPTS,
  ServiceOrderCommandRunner,
} from './ServiceOrderCommandRunner.ts';

describe('ServiceOrderCommandRunner', () => {
  const unitOfWork = makeUnitOfWorkMock();
  const orderRepository = makeServiceOrderRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const runner = new ServiceOrderCommandRunner(unitOfWork, orderRepository, eventPublisher);
  const id = ORDER_ID;

  beforeEach(() => {
    unitOfWork.run.mockClear();
    orderRepository.findById.mockReset();
    orderRepository.update.mockReset();
    eventPublisher.publish.mockReset();
  });

  it('carrega, aplica o comando e grava a OS dentro da unidade de trabalho', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());

    const order = await runner.run(id, (target) => target.startDiagnosis());

    expect(order.status).toBe('IN_DIAGNOSIS');
    expect(unitOfWork.run).toHaveBeenCalledOnce();
    expect(orderRepository.update).toHaveBeenCalledWith(order);
  });

  it('publica os eventos da OS e das pecas so depois da unidade de trabalho confirmar', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    const steps: string[] = [];
    unitOfWork.run.mockImplementation(async (work) => {
      const result = await work();
      steps.push('commit');

      return result;
    });
    eventPublisher.publish.mockImplementation(async (events) => {
      steps.push(`publish:${events.map((event) => event.name).join(',')}`);
    });
    const part = makePart({ quantity: 10 });

    const order = await runner.run(id, (target) => {
      target.startDiagnosis();
      part.reserve(1);

      return [part];
    });

    expect(steps).toEqual(['commit', 'publish:DiagnosisStartedEvent', 'publish:PartReservedEvent']);
    expect(order.raisedEvents).toHaveLength(0);
    expect(part.raisedEvents).toHaveLength(0);
  });

  it('rejeita com NotFoundError quando a OS nao existe', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await expect(runner.run(id, vi.fn())).rejects.toBeInstanceOf(NotFoundError);
    expect(orderRepository.update).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('nao grava nem publica quando o comando viola uma regra de dominio', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());

    await expect(runner.run(id, (target) => target.finish())).rejects.toBeInstanceOf(DomainError);
    expect(orderRepository.update).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('em conflito de versao, refaz tudo a partir de uma nova leitura e publica uma vez', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    orderRepository.update
      .mockRejectedValueOnce(new ConcurrentUpdateError('Ordem de Servico'))
      .mockResolvedValue(undefined);

    const order = await runner.run(id, (target) => target.startDiagnosis());

    expect(order.status).toBe('IN_DIAGNOSIS');
    expect(unitOfWork.run).toHaveBeenCalledTimes(2);
    expect(orderRepository.findById).toHaveBeenCalledTimes(2);
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
  });

  it('reavalia as regras sobre a OS nova: o conflito pode torná-la invalida', async () => {
    orderRepository.findById
      .mockImplementationOnce(async () => makeServiceOrder())
      .mockImplementation(async () => {
        const advanced = makeServiceOrder();
        advanced.startDiagnosis();

        return advanced;
      });
    orderRepository.update.mockRejectedValueOnce(new ConcurrentUpdateError('Ordem de Servico'));

    await expect(runner.run(id, (target) => target.startDiagnosis())).rejects.toMatchObject({
      code: 'INVALID_ORDER_TRANSITION',
    });
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('desiste depois do limite de tentativas e nao publica', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    orderRepository.update.mockRejectedValue(new ConcurrentUpdateError('Ordem de Servico'));

    await expect(runner.run(id, (target) => target.startDiagnosis())).rejects.toBeInstanceOf(
      ConcurrentUpdateError,
    );
    expect(unitOfWork.run).toHaveBeenCalledTimes(ORDER_COMMAND_MAX_ATTEMPTS);
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('nao repete outros erros', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());
    orderRepository.update.mockRejectedValue(new Error('conexao perdida'));

    await expect(runner.run(id, (target) => target.startDiagnosis())).rejects.toThrow(
      'conexao perdida',
    );
    expect(unitOfWork.run).toHaveBeenCalledOnce();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });
});
