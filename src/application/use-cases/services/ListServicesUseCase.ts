import { inject, injectable } from 'inversify';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import type { ListServicesInput } from '../../dto/inputs/ListServicesInput.ts';
import type { ServicePageOutput } from '../../dto/outputs/ServiceOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ServiceResponseMapper } from '../../mappers/ServiceResponseMapper.ts';

@injectable()
export class ListServicesUseCase {
  constructor(
    @inject(TYPES.ServiceRepository)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(input: ListServicesInput): Promise<ServicePageOutput> {
    const { items, total } = await this.serviceRepository.list({
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      items: items.map((service) => ServiceResponseMapper.toResponse(service)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
