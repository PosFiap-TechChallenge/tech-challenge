import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type BudgetGeneratedPayload = {
  orderId: ServiceOrderId;
  total: number;
};

export class BudgetGeneratedEvent extends DomainEvent<BudgetGeneratedPayload> {
  readonly name = 'BudgetGeneratedEvent';
}
