import type { Customer } from '../../domain/aggregates/Customer.ts';
import type { CustomerOutput } from '../dto/outputs/CustomerOutput.ts';

export class CustomerResponseMapper {
  static toResponse(customer: Customer): CustomerOutput {
    return {
      id: customer.id,
      name: customer.name,
      document: customer.document.value,
      documentType: customer.document.type,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
