import type { ZodType } from 'zod';
import { DomainError } from '../errors/DomainError.ts';
import { CustomerCreatedEvent } from '../events/CustomerCreatedEvent.ts';
import { emailSchema } from '../schemas/EmailSchema.ts';
import { phoneSchema } from '../schemas/PhoneSchema.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { generateId } from '../shared/Entity.ts';
import { TaxDocument } from '../value-objects/TaxDocument.ts';

export type CustomerId = Brand<string, 'CustomerId'>;

type CustomerProps = {
  name: string;
  document: TaxDocument;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerPrimitives = {
  id: string;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewCustomerData = {
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
};

/** `undefined` mantem o valor atual; `null` limpa os campos opcionais. */
export type UpdateCustomerChanges = {
  name?: string | undefined;
  document?: string | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
};

/** Contato em branco equivale a ausente; preenchido, precisa satisfazer o schema. */
function parseOptionalContact(
  schema: ZodType<string, string>,
  raw: string | null,
  message: string,
  code: string,
): string | null {
  if (!raw?.trim()) {
    return null;
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    throw new DomainError(message, code);
  }

  return result.data;
}

export class Customer extends AggregateRoot<CustomerProps, CustomerId> {
  private constructor(props: CustomerProps, id: CustomerId) {
    super(props, id);
  }

  private static build(primitives: Omit<CustomerPrimitives, 'id'>): CustomerProps {
    return {
      name: Customer.requireValidName(primitives.name),
      document: TaxDocument.create(primitives.document),
      email: Customer.normalizeEmail(primitives.email),
      phone: Customer.normalizePhone(primitives.phone),
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  static create(input: NewCustomerData): Customer {
    const now = new Date();

    const customer = new Customer(
      Customer.build({ ...input, createdAt: now, updatedAt: now }),
      generateId<CustomerId>(),
    );

    customer.raiseEvent(
      new CustomerCreatedEvent({ customerId: customer.id, documentType: customer.document.type }),
    );

    return customer;
  }

  static from(primitives: CustomerPrimitives): Customer {
    return new Customer(Customer.build(primitives), primitives.id as CustomerId);
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

  /** Valida todos os campos antes de aplicar: uma falha nao deixa o cliente parcialmente alterado. */
  update(changes: UpdateCustomerChanges): void {
    const nextProps = Customer.build({
      name: changes.name ?? this.props.name,
      document: changes.document ?? this.props.document.value,
      email: changes.email === undefined ? this.props.email : changes.email,
      phone: changes.phone === undefined ? this.props.phone : changes.phone,
      createdAt: this.props.createdAt,
      updatedAt: new Date(),
    });

    Object.assign(this.props, nextProps);
  }

  private static requireValidName(raw: string): string {
    const name = raw.trim();

    if (!name) {
      throw new DomainError('Nome do cliente e obrigatorio', 'INVALID_CUSTOMER_NAME');
    }

    return name;
  }

  private static normalizeEmail(raw: string | null): string | null {
    return parseOptionalContact(
      emailSchema(),
      raw,
      'E-mail do cliente em formato invalido',
      'INVALID_EMAIL',
    );
  }

  private static normalizePhone(raw: string | null): string | null {
    return parseOptionalContact(
      phoneSchema(),
      raw,
      'Telefone do cliente em formato invalido',
      'INVALID_PHONE',
    );
  }
}
