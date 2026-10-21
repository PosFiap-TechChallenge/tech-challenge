import type { PartId } from '../aggregates/Part.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type InitialStockRegisteredPayload = {
  partId: PartId;
  code: string;
  quantity: number;
  minimumStock: number;
};

export class InitialStockRegisteredEvent extends DomainEvent<InitialStockRegisteredPayload> {
  readonly name = 'InitialStockRegisteredEvent';
}
