import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type PartAddedPayload = {
  orderId: ServiceOrderId;
  partId: string;
  quantity: number;
};

export class PartAddedEvent extends DomainEvent<PartAddedPayload> {
  readonly name = 'PartAddedEvent';
}
