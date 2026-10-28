import { inject, injectable } from 'inversify';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';
import type { OrderStockService } from '../../services/OrderStockService.ts';
import type { ServiceOrderCommandRunner } from '../../services/ServiceOrderCommandRunner.ts';

/** Finalizar o servico: conclui a execucao e consome as pecas reservadas, tudo ou nada na mesma transacao da OS. */
@injectable()
export class FinishServiceUseCase {
  constructor(
    @inject(TYPES.ServiceOrderCommandRunner)
    private readonly commandRunner: ServiceOrderCommandRunner,
    @inject(TYPES.OrderStockService)
    private readonly orderStockService: OrderStockService,
  ) {}

  async execute(id: ServiceOrderId): Promise<ServiceOrderOutput> {
    const order = await this.commandRunner.run(id, (target) => {
      target.finish();

      return this.orderStockService.consume(target);
    });

    return ServiceOrderResponseMapper.toResponse(order);
  }
}
