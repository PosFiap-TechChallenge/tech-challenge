import type { ServiceId } from '../aggregates/Service.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';

export type ServiceRegisteredPayload = {
  serviceId: ServiceId;
  name: string;
};

export class ServiceRegisteredEvent extends DomainEvent<ServiceRegisteredPayload> {
  readonly name = 'ServiceRegisteredEvent';
}
