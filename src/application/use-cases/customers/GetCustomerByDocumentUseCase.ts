import { inject, injectable } from 'inversify';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import { TaxDocument } from '../../../domain/value-objects/TaxDocument.ts';
import type { CustomerOutput } from '../../dto/outputs/CustomerOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { CustomerResponseMapper } from '../../mappers/CustomerResponseMapper.ts';

@injectable()
export class GetCustomerByDocumentUseCase {
  constructor(
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(rawDocument: string): Promise<CustomerOutput> {
    const document = TaxDocument.create(rawDocument);

    const customer = await this.customerRepository.findByDocument(document);

    if (!customer) {
      throw new NotFoundError('Cliente');
    }

    return CustomerResponseMapper.toResponse(customer);
  }
}
