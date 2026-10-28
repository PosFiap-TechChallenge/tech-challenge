import { makeEventPublisherMock } from '../../domain/test/mocks/PartRepositoryMock.ts';
import {
  makeServiceOrderRepositoryMock,
  makeUnitOfWorkMock,
} from '../../domain/test/mocks/ServiceOrderRepositoryMock.ts';
import { ServiceOrderCommandRunner } from '../services/ServiceOrderCommandRunner.ts';

/** Executor real sobre mocks, para testar os casos de uso de comando da OS. */
export function makeRunnerKit() {
  const unitOfWork = makeUnitOfWorkMock();
  const orderRepository = makeServiceOrderRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const runner = new ServiceOrderCommandRunner(unitOfWork, orderRepository, eventPublisher);

  function reset(): void {
    unitOfWork.run.mockClear();
    orderRepository.findById.mockReset();
    orderRepository.update.mockReset();
    eventPublisher.publish.mockReset();
  }

  return { unitOfWork, orderRepository, eventPublisher, runner, reset };
}
