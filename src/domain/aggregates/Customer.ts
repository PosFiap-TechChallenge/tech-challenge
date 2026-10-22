import type { z } from 'zod';
import { CustomerCreatedEvent } from '../events/CustomerCreatedEvent.ts';
import { customerSchema, type CustomerData } from '../schemas/CustomerSchema.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { applyChanges, type Changes } from '../shared/Changes.ts';
import { generateId } from '../shared/Entity.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import { TaxDocument } from '../value-objects/TaxDocument.ts';

export type CustomerId = Brand<string, 'CustomerId'>;

type CustomerProps = Omit<CustomerData, 'id' | 'document'> & { document: TaxDocument };

type CustomerContent = Omit<CustomerData, 'id' | 'createdAt' | 'updatedAt'>;

const ERROR_CODES = {
  name: 'INVALID_CUSTOMER_NAME',
  document: 'INVALID_TAX_DOCUMENT',
  email: 'INVALID_EMAIL',
  phone: 'INVALID_PHONE',
};

export class Customer extends AggregateRoot<CustomerProps, CustomerId> {
  private constructor(props: CustomerProps, id: CustomerId) {
    super(props, id);
  }

  private static parse(data: z.input<typeof customerSchema>): CustomerData {
    return parseSchema(customerSchema, data, ERROR_CODES, 'INVALID_CUSTOMER');
  }

  private static toProps({ id: _id, document, ...data }: CustomerData): CustomerProps {
    return { ...data, document: TaxDocument.create(document) };
  }

  static create(input: CustomerContent): Customer {
    const now = new Date();

    const customer = Customer.from({
      ...input,
      id: generateId<CustomerId>(),
      createdAt: now,
      updatedAt: now,
    });

    customer.raiseEvent(
      new CustomerCreatedEvent({ customerId: customer.id, documentType: customer.document.type }),
    );

    return customer;
  }

  static from(data: z.input<typeof customerSchema>): Customer {
    const customer = Customer.parse(data);

    return new Customer(Customer.toProps(customer), customer.id as CustomerId);
  }

  get name(): string {
    return this.props.name;
  }

  get document(): TaxDocument {
    return this.props.document;
  }

  get email(): string | null {
    return this.props.email;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toData(): CustomerData {
    return { ...this.props, id: this.id, document: this.props.document.value };
  }

  /** Valida todos os campos antes de aplicar: uma falha nao deixa o cliente parcialmente alterado. */
  update(changes: Changes<CustomerContent>): void {
    const next = Customer.parse({ ...applyChanges(this.toData(), changes), updatedAt: new Date() });

    Object.assign(this.props, Customer.toProps(next));
  }
}
