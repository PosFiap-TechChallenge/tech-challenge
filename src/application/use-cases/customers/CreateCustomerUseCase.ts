import { inject, injectable } from 'inversify';
import { Customer } from '../../../domain/aggregates/Customer.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { CreateCustomerInput } from '../../dto/inputs/CreateCustomerInput.ts';
import type { CustomerOutput } from '../../dto/outputs/CustomerOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { CustomerResponseMapper } from '../../mappers/CustomerResponseMapper.ts';

@injectable()
export class CreateCustomerUseCase {
  constructor(
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(input: CreateCustomerInput): Promise<CustomerOutput> {
    const customer = Customer.create(input);

    const existingCustomer = await this.customerRepository.findByDocument(customer.document);

    if (existingCustomer) {
      throw new ConflictError('Cliente', 'documento');
    }

    await this.customerRepository.create(customer);

    return CustomerResponseMapper.toResponse(customer);
  }
}
