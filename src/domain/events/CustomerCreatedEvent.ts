import type { CustomerId } from '../aggregates/Customer.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';
import type { TaxDocumentType } from '../value-objects/TaxDocument.ts';

export type CustomerCreatedPayload = {
  customerId: CustomerId;
  documentType: TaxDocumentType;
};

export class CustomerCreatedEvent extends DomainEvent<CustomerCreatedPayload> {
  readonly name = 'CustomerCreatedEvent';
}
