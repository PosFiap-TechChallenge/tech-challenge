import { inject, injectable } from 'inversify';
import type { ServiceOrderRepository } from '../../../domain/repositories/ServiceOrderRepository.ts';
import type { ListServiceOrdersInput } from '../../dto/inputs/ListServiceOrdersInput.ts';
import type { ServiceOrderPageOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';

@injectable()
export class ListServiceOrdersUseCase {
  constructor(
    @inject(TYPES.ServiceOrderRepository)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(input: ListServiceOrdersInput): Promise<ServiceOrderPageOutput> {
    const { items, total } = await this.orderRepository.list({
      page: input.page,
      pageSize: input.pageSize,
      status: input.status,
      customerId: input.customerId,
    });

    return {
      items: items.map((order) => ServiceOrderResponseMapper.toSummary(order)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
