import type { PartId } from '../aggregates/Part.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type PartReservationReleasedPayload = {
  partId: PartId;
  quantity: number;
  reservedAfter: number;
};

export class PartReservationReleasedEvent extends DomainEvent<PartReservationReleasedPayload> {
  readonly name = 'PartReservationReleasedEvent';
}
