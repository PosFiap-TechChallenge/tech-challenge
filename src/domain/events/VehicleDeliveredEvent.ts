import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type VehicleDeliveredPayload = {
  orderId: ServiceOrderId;
};

export class VehicleDeliveredEvent extends DomainEvent<VehicleDeliveredPayload> {
  readonly name = 'VehicleDeliveredEvent';
}
