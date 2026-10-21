import { describe, expect, it, vi } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { MinimumStockReachedEvent } from '../../../domain/events/MinimumStockReachedEvent.ts';
import { PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import { MinimumStockReachedAlertHandler } from './MinimumStockReachedAlertHandler.ts';

describe('MinimumStockReachedAlertHandler', () => {
  const event = new MinimumStockReachedEvent({
    partId: PART_ID as PartId,
    code: 'FLT-OLEO-01',
    balance: 2,
    minimumStock: 3,
  });

  it('assina o evento de estoque minimo atingido', () => {
    expect(new MinimumStockReachedAlertHandler().eventName).toBe(event.name);
  });

  it('emite um alerta no log com a peca e os saldos', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    await new MinimumStockReachedAlertHandler().handle(event);

    const entry = JSON.parse(String(stderr.mock.calls[0]?.[0])) as Record<string, unknown>;
    stderr.mockRestore();

    expect(entry).toMatchObject({
      level: 'warn',
      message: 'estoque minimo atingido',
      partId: PART_ID,
      code: 'FLT-OLEO-01',
      balance: 2,
      minimumStock: 3,
    });
  });
});
