import { inject, injectable } from 'inversify';
import type { Customer, CustomerId } from '../../../domain/aggregates/Customer.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { UpdateCustomerInput } from '../../dto/inputs/UpdateCustomerInput.ts';
import type { CustomerOutput } from '../../dto/outputs/CustomerOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { CustomerResponseMapper } from '../../mappers/CustomerResponseMapper.ts';

@injectable()
export class UpdateCustomerUseCase {
  constructor(
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(id: CustomerId, input: UpdateCustomerInput): Promise<CustomerOutput> {
    const customer = await this.customerRepository.findById(id);

    if (!customer) {
      throw new NotFoundError('Cliente');
    }

    customer.update(input);

    if (input.document !== undefined) {
      await this.assertDocumentIsAvailable(customer);
    }

    await this.customerRepository.update(customer);

    return CustomerResponseMapper.toResponse(customer);
  }

  private async assertDocumentIsAvailable(customer: Customer): Promise<void> {
    const documentOwner = await this.customerRepository.findByDocument(customer.document);

    if (documentOwner && !documentOwner.equals(customer)) {
      throw new ConflictError('Cliente', 'documento');
    }
  }
}
