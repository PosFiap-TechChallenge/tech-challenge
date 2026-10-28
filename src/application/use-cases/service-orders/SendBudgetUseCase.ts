import { inject, injectable } from 'inversify';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';
import type { ServiceOrderCommandRunner } from '../../services/ServiceOrderCommandRunner.ts';

/** Gerar e enviar o orcamento: calcula o total dos servicos e pecas e deixa a OS aguardando aprovacao. */
@injectable()
export class SendBudgetUseCase {
  constructor(
    @inject(TYPES.ServiceOrderCommandRunner)
    private readonly commandRunner: ServiceOrderCommandRunner,
  ) {}

  async execute(id: ServiceOrderId): Promise<ServiceOrderOutput> {
    const order = await this.commandRunner.run(id, (target) => target.sendBudget());

    return ServiceOrderResponseMapper.toResponse(order);
  }
}
