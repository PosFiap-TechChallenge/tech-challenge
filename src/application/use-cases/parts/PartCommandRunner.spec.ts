import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makePart, PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import {
  makeEventPublisherMock,
  makePartRepositoryMock,
} from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { ConcurrentUpdateError, NotFoundError } from '../../exceptions/AppError.ts';
import { PART_COMMAND_MAX_ATTEMPTS, PartCommandRunner } from './PartCommandRunner.ts';

describe('PartCommandRunner', () => {
  const partRepository = makePartRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const runner = new PartCommandRunner(partRepository, eventPublisher);
  const id = PART_ID as PartId;
  const withRetry = { retryOnConcurrentUpdate: true };
  const withoutRetry = { retryOnConcurrentUpdate: false };

  beforeEach(() => {
    partRepository.findById.mockReset();
    partRepository.updateAll.mockReset();
    eventPublisher.publish.mockReset();
  });

  it('aplica o comando, persiste e publica os eventos depois de persistir', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10 }));
    const order: string[] = [];
    partRepository.updateAll.mockImplementation(async () => {
      order.push('update');
    });
    eventPublisher.publish.mockImplementation(async (events) => {
      order.push(`publish:${events.map((event) => event.name).join(',')}`);
    });

    const part = await runner.run(id, (target) => target.reserve(4), withRetry);

    expect(part.reserved).toBe(4);
    expect(order).toEqual(['update', 'publish:PartReservedEvent']);
    expect(part.raisedEvents).toHaveLength(0);
  });

  it('rejeita com NotFoundError quando a peca nao existe', async () => {
    partRepository.findById.mockResolvedValue(null);

    await expect(runner.run(id, vi.fn(), withRetry)).rejects.toBeInstanceOf(NotFoundError);
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });

  it('nao persiste nem publica quando o comando viola uma regra de dominio', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 1 }));

    await expect(runner.run(id, (target) => target.reserve(2), withRetry)).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(partRepository.updateAll).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('em conflito de versao, rele a peca e reaplica o comando sobre o saldo novo', async () => {
    partRepository.findById
      .mockResolvedValueOnce(makePart({ quantity: 10, reserved: 0, version: 0 }))
      .mockResolvedValueOnce(makePart({ quantity: 10, reserved: 6, version: 1 }));
    partRepository.updateAll
      .mockRejectedValueOnce(new ConcurrentUpdateError('Peca'))
      .mockResolvedValueOnce(undefined);

    const part = await runner.run(id, (target) => target.reserve(3), withRetry);

    expect(partRepository.findById).toHaveBeenCalledTimes(2);
    expect(part.reserved).toBe(9);
    expect(part.version).toBe(1);
    expect(eventPublisher.publish).toHaveBeenCalledOnce();
  });

  it('a regra de dominio vale de novo na retentativa: sem saldo apos o conflito, bloqueia', async () => {
    partRepository.findById
      .mockResolvedValueOnce(makePart({ quantity: 10, reserved: 0 }))
      .mockResolvedValueOnce(makePart({ quantity: 10, reserved: 8, version: 1 }));
    partRepository.updateAll.mockRejectedValueOnce(new ConcurrentUpdateError('Peca'));

    await expect(runner.run(id, (target) => target.reserve(3), withRetry)).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
    });
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it(`desiste depois de ${PART_COMMAND_MAX_ATTEMPTS} tentativas em conflito`, async () => {
    partRepository.findById.mockImplementation(async () => makePart());
    partRepository.updateAll.mockRejectedValue(new ConcurrentUpdateError('Peca'));

    await expect(
      runner.run(id, (target) => target.registerEntry(1), withRetry),
    ).rejects.toBeInstanceOf(ConcurrentUpdateError);
    expect(partRepository.updateAll).toHaveBeenCalledTimes(PART_COMMAND_MAX_ATTEMPTS);
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('sem retentativa, propaga o conflito na primeira tentativa', async () => {
    partRepository.findById.mockImplementation(async () => makePart());
    partRepository.updateAll.mockRejectedValue(new ConcurrentUpdateError('Peca'));

    await expect(
      runner.run(id, (target) => target.adjust(5, 'Inventario'), withoutRetry),
    ).rejects.toBeInstanceOf(ConcurrentUpdateError);
    expect(partRepository.updateAll).toHaveBeenCalledOnce();
  });

  it('nao repete outros erros de persistencia', async () => {
    partRepository.findById.mockImplementation(async () => makePart());
    partRepository.updateAll.mockRejectedValue(new Error('conexao perdida'));

    await expect(runner.run(id, (target) => target.registerEntry(1), withRetry)).rejects.toThrow(
      'conexao perdida',
    );
    expect(partRepository.updateAll).toHaveBeenCalledOnce();
  });
});
