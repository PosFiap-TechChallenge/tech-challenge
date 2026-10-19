import { inject, injectable } from 'inversify';
import type { CustomerId } from '../../../domain/aggregates/Customer.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { CustomerOutput } from '../../dto/outputs/CustomerOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { CustomerResponseMapper } from '../../mappers/CustomerResponseMapper.ts';

@injectable()
export class GetCustomerByIdUseCase {
  constructor(
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(id: CustomerId): Promise<CustomerOutput> {
    const customer = await this.customerRepository.findById(id);

    if (!customer) {
      throw new NotFoundError('Cliente');
    }

    return CustomerResponseMapper.toResponse(customer);
  }
}
