import { inject, injectable } from 'inversify';
import type { ServiceId } from '../../../domain/aggregates/Service.ts';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';

@injectable()
export class DeleteServiceUseCase {
  constructor(
    @inject(TYPES.ServiceRepository)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(id: ServiceId): Promise<void> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new NotFoundError('Servico');
    }

    await this.serviceRepository.delete(service.id);
  }
}
