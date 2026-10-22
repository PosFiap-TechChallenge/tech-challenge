import type { Customer as CustomerRecord } from '@prisma/client';
import { Customer } from '../../../domain/aggregates/Customer.ts';

export class CustomerPersistenceMapper {
  static toDomain(record: CustomerRecord): Customer {
    return Customer.from(record);
  }

  static toPersistence(customer: Customer): CustomerRecord {
    return customer.toData();
  }
}
