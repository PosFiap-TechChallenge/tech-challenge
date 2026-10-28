import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type BudgetRejectedPayload = {
  orderId: ServiceOrderId;
};

export class BudgetRejectedEvent extends DomainEvent<BudgetRejectedPayload> {
  readonly name = 'BudgetRejectedEvent';
}
