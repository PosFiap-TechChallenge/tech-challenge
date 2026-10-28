import { inject, injectable } from 'inversify';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { ServiceId } from '../../../domain/aggregates/Service.ts';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import type { AddOrderServiceInput } from '../../dto/inputs/ServiceOrderItemInputs.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';
import type { ServiceOrderCommandRunner } from '../../services/ServiceOrderCommandRunner.ts';

/** Incluir servico: copia nome, preco e tempo estimado do catalogo para o Item de Servico da OS. */
@injectable()
export class AddServiceToOrderUseCase {
  constructor(
    @inject(TYPES.ServiceOrderCommandRunner)
    private readonly commandRunner: ServiceOrderCommandRunner,
    @inject(TYPES.ServiceRepository)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(id: ServiceOrderId, input: AddOrderServiceInput): Promise<ServiceOrderOutput> {
    const service = await this.serviceRepository.findById(input.serviceId as ServiceId);

    if (!service) {
      throw new NotFoundError('Servico');
    }

    const order = await this.commandRunner.run(id, (target) => target.addService(service.toData()));

    return ServiceOrderResponseMapper.toResponse(order);
  }
}
