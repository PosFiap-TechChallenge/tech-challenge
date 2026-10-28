import { inject, injectable } from 'inversify';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';
import type { ServiceOrderCommandRunner } from '../../services/ServiceOrderCommandRunner.ts';

@injectable()
export class RemovePartFromOrderUseCase {
  constructor(
    @inject(TYPES.ServiceOrderCommandRunner)
    private readonly commandRunner: ServiceOrderCommandRunner,
  ) {}

  async execute(id: ServiceOrderId, itemId: string): Promise<ServiceOrderOutput> {
    const order = await this.commandRunner.run(id, (target) => target.removePart(itemId));

    return ServiceOrderResponseMapper.toResponse(order);
  }
}
