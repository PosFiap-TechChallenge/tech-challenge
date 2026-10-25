import type { Service } from '../../domain/aggregates/Service.ts';
import type { ServiceOutput } from '../dto/outputs/ServiceOutput.ts';

export class ServiceResponseMapper {
  static toResponse(service: Service): ServiceOutput {
    return {
      id: service.id,
      name: service.name,
      price: service.price,
      estimatedMinutes: service.estimatedMinutes,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }
}
