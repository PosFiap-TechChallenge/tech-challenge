import { inject, injectable } from 'inversify';
import type { CustomerId } from '../../../domain/aggregates/Customer.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';

@injectable()
export class DeleteCustomerUseCase {
  constructor(
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(id: CustomerId): Promise<void> {
    const customer = await this.customerRepository.findById(id);

    if (!customer) {
      throw new NotFoundError('Cliente');
    }

    await this.customerRepository.delete(customer.id);
  }
}
