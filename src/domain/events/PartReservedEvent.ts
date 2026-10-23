import type { PartId } from '../aggregates/Part.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type PartReservedPayload = {
  partId: PartId;
  quantity: number;
  reservedAfter: number;
};

export class PartReservedEvent extends DomainEvent<PartReservedPayload> {
  readonly name = 'PartReservedEvent';
}
