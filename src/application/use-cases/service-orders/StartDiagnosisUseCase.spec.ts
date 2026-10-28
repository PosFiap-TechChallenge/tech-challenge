import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import {
  makeServiceOrder,
  makeServiceOrderIn,
  ORDER_ID,
} from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { makeRunnerKit } from '../../test/RunnerKit.ts';
import { StartDiagnosisUseCase } from './StartDiagnosisUseCase.ts';

describe('StartDiagnosisUseCase', () => {
  const { orderRepository, eventPublisher, runner, reset } = makeRunnerKit();
  const useCase = new StartDiagnosisUseCase(runner);
  const id = ORDER_ID;

  beforeEach(reset);

  it('move a OS para Em diagnostico, grava e publica o evento', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrder());

    const output = await useCase.execute(id);

    expect(output.status).toBe('IN_DIAGNOSIS');
    expect(output.history.map((change) => change.status)).toEqual(['RECEIVED', 'IN_DIAGNOSIS']);
    expect(orderRepository.update).toHaveBeenCalledOnce();
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
  });

  it('rejeita com DomainError quando a OS nao esta Recebida', async () => {
    orderRepository.findById.mockImplementation(async () => makeServiceOrderIn('IN_EXECUTION'));

    await expect(useCase.execute(id)).rejects.toBeInstanceOf(DomainError);
    expect(orderRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita com NotFoundError quando a OS nao existe', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
