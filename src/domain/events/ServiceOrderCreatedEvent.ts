import type { CustomerId } from '../aggregates/Customer.ts';
import type { ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import type { VehicleId } from '../aggregates/Vehicle.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type ServiceOrderCreatedPayload = {
  orderId: ServiceOrderId;
  customerId: CustomerId;
  vehicleId: VehicleId;
};

export class ServiceOrderCreatedEvent extends DomainEvent<ServiceOrderCreatedPayload> {
  readonly name = 'ServiceOrderCreatedEvent';
}
