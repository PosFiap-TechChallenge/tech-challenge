import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type ExecutionStartedPayload = {
  orderId: ServiceOrderId;
};

export class ExecutionStartedEvent extends DomainEvent<ExecutionStartedPayload> {
  readonly name = 'ExecutionStartedEvent';
}
