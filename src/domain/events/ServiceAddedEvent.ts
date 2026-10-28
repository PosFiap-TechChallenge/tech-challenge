import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type ServiceAddedPayload = {
  orderId: ServiceOrderId;
  serviceId: string;
  price: number;
};

export class ServiceAddedEvent extends DomainEvent<ServiceAddedPayload> {
  readonly name = 'ServiceAddedEvent';
}
