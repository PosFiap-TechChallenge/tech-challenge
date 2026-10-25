import { inject, injectable } from 'inversify';
import type { ServiceId } from '../../../domain/aggregates/Service.ts';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import type { ServiceOutput } from '../../dto/outputs/ServiceOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { ServiceResponseMapper } from '../../mappers/ServiceResponseMapper.ts';

@injectable()
export class GetServiceByIdUseCase {
  constructor(
    @inject(TYPES.ServiceRepository)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(id: ServiceId): Promise<ServiceOutput> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new NotFoundError('Servico');
    }

    return ServiceResponseMapper.toResponse(service);
  }
}
