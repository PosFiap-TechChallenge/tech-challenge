import { inject, injectable } from 'inversify';
import type { CustomerId } from '../../../domain/aggregates/Customer.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import type { ListVehiclesInput } from '../../dto/inputs/ListVehiclesInput.ts';
import type { VehiclePageOutput } from '../../dto/outputs/VehicleOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { VehicleResponseMapper } from '../../mappers/VehicleResponseMapper.ts';

@injectable()
export class ListVehiclesUseCase {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(input: ListVehiclesInput): Promise<VehiclePageOutput> {
    const { items, total } = await this.vehicleRepository.list({
      page: input.page,
      pageSize: input.pageSize,
      customerId: input.customerId as CustomerId | undefined,
    });

    return {
      items: items.map((vehicle) => VehicleResponseMapper.toResponse(vehicle)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
