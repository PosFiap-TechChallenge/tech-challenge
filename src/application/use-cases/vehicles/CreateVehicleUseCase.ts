import { inject, injectable } from 'inversify';
import { Vehicle } from '../../../domain/aggregates/Vehicle.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import type { CreateVehicleInput } from '../../dto/inputs/CreateVehicleInput.ts';
import type { VehicleOutput } from '../../dto/outputs/VehicleOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { VehicleResponseMapper } from '../../mappers/VehicleResponseMapper.ts';

@injectable()
export class CreateVehicleUseCase {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly vehicleRepository: VehicleRepository,
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(input: CreateVehicleInput): Promise<VehicleOutput> {
    const vehicle = Vehicle.create(input);

    const customer = await this.customerRepository.findById(vehicle.customerId);

    if (!customer) {
      throw new NotFoundError('Cliente');
    }

    const existingVehicle = await this.vehicleRepository.findByPlate(vehicle.plate);

    if (existingVehicle) {
      throw new ConflictError('Veiculo', 'placa');
    }

    await this.vehicleRepository.create(vehicle);

    return VehicleResponseMapper.toResponse(vehicle);
  }
}
