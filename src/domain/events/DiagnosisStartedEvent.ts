import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type DiagnosisStartedPayload = {
  orderId: ServiceOrderId;
};

export class DiagnosisStartedEvent extends DomainEvent<DiagnosisStartedPayload> {
  readonly name = 'DiagnosisStartedEvent';
}
