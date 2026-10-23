import type { PartId } from '../aggregates/Part.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type MinimumStockReachedPayload = {
  partId: PartId;
  code: string;
  balance: number;
  minimumStock: number;
};

export class MinimumStockReachedEvent extends DomainEvent<MinimumStockReachedPayload> {
  readonly name = 'MinimumStockReachedEvent';
}
