import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type BudgetApprovedPayload = {
  orderId: ServiceOrderId;
  total: number;
};

export class BudgetApprovedEvent extends DomainEvent<BudgetApprovedPayload> {
  readonly name = 'BudgetApprovedEvent';
}
