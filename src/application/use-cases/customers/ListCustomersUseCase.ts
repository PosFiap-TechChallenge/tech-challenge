import { inject, injectable } from 'inversify';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { ListCustomersInput } from '../../dto/inputs/ListCustomersInput.ts';
import type { CustomerPageOutput } from '../../dto/outputs/CustomerOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { CustomerResponseMapper } from '../../mappers/CustomerResponseMapper.ts';

@injectable()
export class ListCustomersUseCase {
  constructor(
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(input: ListCustomersInput): Promise<CustomerPageOutput> {
    const { items, total } = await this.customerRepository.list(input);

    return {
      items: items.map((customer) => CustomerResponseMapper.toResponse(customer)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
