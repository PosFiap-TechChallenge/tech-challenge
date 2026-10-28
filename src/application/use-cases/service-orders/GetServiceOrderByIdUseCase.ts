import { inject, injectable } from 'inversify';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { ServiceOrderRepository } from '../../../domain/repositories/ServiceOrderRepository.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';

@injectable()
export class GetServiceOrderByIdUseCase {
  constructor(
    @inject(TYPES.ServiceOrderRepository)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(id: ServiceOrderId): Promise<ServiceOrderOutput> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de Servico');
    }

    return ServiceOrderResponseMapper.toResponse(order);
  }
}
