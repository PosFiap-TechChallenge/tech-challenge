import { describe, expect, it, vi } from 'vitest';
import type { DomainEventHandler } from '../../application/events/DomainEventHandler.ts';
import { PartConsumedEvent } from '../../domain/events/PartConsumedEvent.ts';
import { PartReservedEvent } from '../../domain/events/PartReservedEvent.ts';
import type { PartId } from '../../domain/aggregates/Part.ts';
import { PART_ID } from '../../domain/test/mocks/PartMock.ts';
import { InProcessEventPublisher } from './InProcessEventPublisher.ts';

const partId = PART_ID as PartId;

function makeHandler(eventName: string, handle = vi.fn()): DomainEventHandler {
  return { eventName, handle };
}

describe('InProcessEventPublisher', () => {
  it('entrega cada evento apenas aos handlers do mesmo nome, na ordem dos eventos', async () => {
    const received: string[] = [];
    const reserved = makeHandler(
      'PartReservedEvent',
      vi.fn(async () => void received.push('reserved')),
    );
    const consumed = makeHandler(
      'PartConsumedEvent',
      vi.fn(async () => void received.push('consumed')),
    );
    const publisher = new InProcessEventPublisher([reserved, consumed]);

    await publisher.publish([
      new PartConsumedEvent({ partId, quantity: 1, balanceAfter: 5 }),
      new PartReservedEvent({ partId, quantity: 1, reservedAfter: 1 }),
    ]);

    expect(received).toEqual(['consumed', 'reserved']);
  });

  it('um handler com falha nao impede os demais nem propaga o erro', async () => {
    const failing = makeHandler(
      'PartReservedEvent',
      vi.fn().mockRejectedValue(new Error('smtp fora')),
    );
    const working = makeHandler('PartReservedEvent');
    const publisher = new InProcessEventPublisher([failing, working]);
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    await expect(
      publisher.publish([new PartReservedEvent({ partId, quantity: 1, reservedAfter: 1 })]),
    ).resolves.toBeUndefined();

    expect(working.handle).toHaveBeenCalledOnce();
    expect(String(stderr.mock.calls[0]?.[0])).toContain('falha ao tratar evento de dominio');
    stderr.mockRestore();
  });

  it('funciona sem nenhum handler registrado', async () => {
    await expect(
      new InProcessEventPublisher().publish([
        new PartReservedEvent({ partId, quantity: 1, reservedAfter: 1 }),
      ]),
    ).resolves.toBeUndefined();
  });
});
