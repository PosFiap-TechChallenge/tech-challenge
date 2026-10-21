import { inject, injectable } from 'inversify';
import type { VehicleId } from '../../../domain/aggregates/Vehicle.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';

@injectable()
export class DeleteVehicleUseCase {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(id: VehicleId): Promise<void> {
    const vehicle = await this.vehicleRepository.findById(id);

    if (!vehicle) {
      throw new NotFoundError('Veiculo');
    }

    await this.vehicleRepository.delete(vehicle.id);
  }
}
