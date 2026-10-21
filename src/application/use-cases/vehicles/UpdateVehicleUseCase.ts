import { inject, injectable } from 'inversify';
import type { Vehicle, VehicleId } from '../../../domain/aggregates/Vehicle.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import type { UpdateVehicleInput } from '../../dto/inputs/UpdateVehicleInput.ts';
import type { VehicleOutput } from '../../dto/outputs/VehicleOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { VehicleResponseMapper } from '../../mappers/VehicleResponseMapper.ts';

@injectable()
export class UpdateVehicleUseCase {
  constructor(
    @inject(TYPES.VehicleRepository)
    private readonly vehicleRepository: VehicleRepository,
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(id: VehicleId, input: UpdateVehicleInput): Promise<VehicleOutput> {
    const vehicle = await this.vehicleRepository.findById(id);

    if (!vehicle) {
      throw new NotFoundError('Veiculo');
    }

    vehicle.update(input);

    if (input.plate !== undefined) {
      await this.assertPlateIsAvailable(vehicle);
    }

    if (input.customerId !== undefined) {
      await this.assertCustomerExists(vehicle);
    }

    await this.vehicleRepository.update(vehicle);

    return VehicleResponseMapper.toResponse(vehicle);
  }

  private async assertPlateIsAvailable(vehicle: Vehicle): Promise<void> {
    const plateOwner = await this.vehicleRepository.findByPlate(vehicle.plate);

    if (plateOwner && !plateOwner.equals(vehicle)) {
      throw new ConflictError('Veiculo', 'placa');
    }
  }

  private async assertCustomerExists(vehicle: Vehicle): Promise<void> {
    const customer = await this.customerRepository.findById(vehicle.customerId);

    if (!customer) {
      throw new NotFoundError('Cliente');
    }
  }
}
