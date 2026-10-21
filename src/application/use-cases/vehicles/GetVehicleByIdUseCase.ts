import { inject, injectable } from 'inversify';
import type { VehicleId } from '../../../domain/aggregates/Vehicle.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import type { VehicleOutput } from '../../dto/outputs/VehicleOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { VehicleResponseMapper } from '../../mappers/VehicleResponseMapper.ts';

@injectable()
export class GetVehicleByIdUseCase {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(id: VehicleId): Promise<VehicleOutput> {
    const vehicle = await this.vehicleRepository.findById(id);

    if (!vehicle) {
      throw new NotFoundError('Veiculo');
    }

    return VehicleResponseMapper.toResponse(vehicle);
  }
}
