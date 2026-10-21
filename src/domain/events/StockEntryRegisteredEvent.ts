import type { PartId } from '../aggregates/Part.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type StockEntryRegisteredPayload = {
  partId: PartId;
  quantity: number;
  balanceAfter: number;
};

export class StockEntryRegisteredEvent extends DomainEvent<StockEntryRegisteredPayload> {
  readonly name = 'StockEntryRegisteredEvent';
}
