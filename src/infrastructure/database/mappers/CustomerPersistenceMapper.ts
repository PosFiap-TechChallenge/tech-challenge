import type { Customer as CustomerRecord } from '@prisma/client';
import { Customer } from '../../../domain/aggregates/Customer.ts';

export class CustomerPersistenceMapper {
  static toDomain(record: CustomerRecord): Customer {
    return Customer.from({
      id: record.id,
      name: record.name,
      document: record.document,
      email: record.email,
      phone: record.phone,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(customer: Customer): CustomerRecord {
    return {
      id: customer.id,
      name: customer.name,
      document: customer.document.value,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
