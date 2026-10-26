import { inject, injectable } from 'inversify';
import { Service } from '../../../domain/aggregates/Service.ts';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import type { CreateServiceInput } from '../../dto/inputs/CreateServiceInput.ts';
import type { ServiceOutput } from '../../dto/outputs/ServiceOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { ServiceResponseMapper } from '../../mappers/ServiceResponseMapper.ts';

@injectable()
export class CreateServiceUseCase {
  constructor(
    @inject(TYPES.ServiceRepository)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(input: CreateServiceInput): Promise<ServiceOutput> {
    const service = Service.create(input);

    const existingService = await this.serviceRepository.findByName(service.name);

    if (existingService) {
      throw new ConflictError('Servico', 'nome');
    }

    await this.serviceRepository.create(service);

    return ServiceResponseMapper.toResponse(service);
  }
}
