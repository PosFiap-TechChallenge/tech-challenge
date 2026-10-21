import type { CustomerId } from '../aggregates/Customer.ts';
import type { VehicleId } from '../aggregates/Vehicle.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type VehicleRegisteredPayload = {
  vehicleId: VehicleId;
  customerId: CustomerId;
  plate: string;
};

export class VehicleRegisteredEvent extends DomainEvent<VehicleRegisteredPayload> {
  readonly name = 'VehicleRegisteredEvent';
}
