import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type BudgetSentPayload = {
  orderId: ServiceOrderId;
  total: number;
};

export class BudgetSentEvent extends DomainEvent<BudgetSentPayload> {
  readonly name = 'BudgetSentEvent';
}
