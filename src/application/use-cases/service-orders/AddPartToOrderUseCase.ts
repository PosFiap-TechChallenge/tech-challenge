import { inject, injectable } from 'inversify';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import type { AddOrderPartInput } from '../../dto/inputs/ServiceOrderItemInputs.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';
import type { ServiceOrderCommandRunner } from '../../services/ServiceOrderCommandRunner.ts';

/**
 * Incluir peca: politica "verificar estoque antes de adicionar peca". Confere o disponivel
 * contra tudo o que a OS ja pede da peca, mas so reserva na aprovacao do orcamento.
 */
@injectable()
export class AddPartToOrderUseCase {
  constructor(
    @inject(TYPES.ServiceOrderCommandRunner)
    private readonly commandRunner: ServiceOrderCommandRunner,
    @inject(TYPES.PartRepository)
    private readonly partRepository: PartRepository,
  ) {}

  async execute(id: ServiceOrderId, input: AddOrderPartInput): Promise<ServiceOrderOutput> {
    const order = await this.commandRunner.run(id, async (target) => {
      const part = await this.partRepository.findById(input.partId as PartId);

      if (!part) {
        throw new NotFoundError('Peca');
      }

      target.addPart(part.toData(), input.quantity);

      part.assertAvailable(target.requestedQuantity(part.id));
    });

    return ServiceOrderResponseMapper.toResponse(order);
  }
}
