import type { PartId } from '../aggregates/Part.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type StockAdjustedPayload = {
  partId: PartId;
  /** Diferenca aplicada ao saldo fisico: positiva (sobra) ou negativa (falta). */
  difference: number;
  balanceAfter: number;
  reason: string;
};

export class StockAdjustedEvent extends DomainEvent<StockAdjustedPayload> {
  readonly name = 'StockAdjustedEvent';
}
