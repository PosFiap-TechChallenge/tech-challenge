import type { PartId } from '../aggregates/Part.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type PartConsumedPayload = {
  partId: PartId;
  quantity: number;
  balanceAfter: number;
};

export class PartConsumedEvent extends DomainEvent<PartConsumedPayload> {
  readonly name = 'PartConsumedEvent';
}
