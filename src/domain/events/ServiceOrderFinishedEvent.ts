import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type ServiceOrderFinishedPayload = {
  orderId: ServiceOrderId;
  executionMinutes: number;
};

export class ServiceOrderFinishedEvent extends DomainEvent<ServiceOrderFinishedPayload> {
  readonly name = 'ServiceOrderFinishedEvent';
}
