import { inject, injectable } from 'inversify';
import type { ServiceOrderRepository } from '../../../domain/repositories/ServiceOrderRepository.ts';
import type { ExecutionTimeOutput } from '../../dto/outputs/ExecutionTimeOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';

/** Monitoramento do tempo medio de execucao dos servicos ja concluidos, geral e por servico. */
@injectable()
export class GetAverageExecutionTimeUseCase {
  constructor(
    @inject(TYPES.ServiceOrderRepository)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(): Promise<ExecutionTimeOutput> {
    const stats = await this.orderRepository.executionTimeStats();

    return ServiceOrderResponseMapper.toExecutionTime(stats);
  }
}
