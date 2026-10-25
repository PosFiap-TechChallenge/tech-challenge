import { inject, injectable } from 'inversify';
import type { Service, ServiceId } from '../../../domain/aggregates/Service.ts';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import type { UpdateServiceInput } from '../../dto/inputs/UpdateServiceInput.ts';
import type { ServiceOutput } from '../../dto/outputs/ServiceOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { ServiceResponseMapper } from '../../mappers/ServiceResponseMapper.ts';

@injectable()
export class UpdateServiceUseCase {
  constructor(
    @inject(TYPES.ServiceRepository)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(id: ServiceId, input: UpdateServiceInput): Promise<ServiceOutput> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new NotFoundError('Servico');
    }

    service.update(input);

    if (input.name !== undefined) {
      await this.assertNameIsAvailable(service);
    }

    await this.serviceRepository.update(service);

    return ServiceResponseMapper.toResponse(service);
  }

  private async assertNameIsAvailable(service: Service): Promise<void> {
    const nameOwner = await this.serviceRepository.findByName(service.name);

    if (nameOwner && !nameOwner.equals(service)) {
      throw new ConflictError('Servico', 'nome');
    }
  }
}
