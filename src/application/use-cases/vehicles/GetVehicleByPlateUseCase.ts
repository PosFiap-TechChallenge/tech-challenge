import { inject, injectable } from 'inversify';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import { LicensePlate } from '../../../domain/value-objects/LicensePlate.ts';
import type { VehicleOutput } from '../../dto/outputs/VehicleOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { VehicleResponseMapper } from '../../mappers/VehicleResponseMapper.ts';

@injectable()
export class GetVehicleByPlateUseCase {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(rawPlate: string): Promise<VehicleOutput> {
    const plate = LicensePlate.create(rawPlate);

    const vehicle = await this.vehicleRepository.findByPlate(plate);

    if (!vehicle) {
      throw new NotFoundError('Veiculo');
    }

    return VehicleResponseMapper.toResponse(vehicle);
  }
}
