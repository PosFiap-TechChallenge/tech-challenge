import { inject, injectable } from 'inversify';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';
import type { OrderStockService } from '../../services/OrderStockService.ts';
import type { ServiceOrderCommandRunner } from '../../services/ServiceOrderCommandRunner.ts';

/** Aprovar o orcamento: a execucao comeca e as pecas sao reservadas, tudo ou nada na mesma transacao da OS. Sem saldo disponivel para qualquer peca, a aprovacao inteira falha. */
@injectable()
export class ApproveBudgetUseCase {
  constructor(
    @inject(TYPES.ServiceOrderCommandRunner)
    private readonly commandRunner: ServiceOrderCommandRunner,
    @inject(TYPES.OrderStockService)
    private readonly orderStockService: OrderStockService,
  ) {}

  async execute(id: ServiceOrderId): Promise<ServiceOrderOutput> {
    const order = await this.commandRunner.run(id, (target) => {
      target.approveBudget();

      return this.orderStockService.reserve(target);
    });

    return ServiceOrderResponseMapper.toResponse(order);
  }
}
