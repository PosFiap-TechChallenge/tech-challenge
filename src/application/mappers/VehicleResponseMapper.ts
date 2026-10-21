import type { Vehicle } from '../../domain/aggregates/Vehicle.ts';
import type { VehicleOutput } from '../dto/outputs/VehicleOutput.ts';

export class VehicleResponseMapper {
  static toResponse(vehicle: Vehicle): VehicleOutput {
    return {
      id: vehicle.id,
      plate: vehicle.plate.value,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      customerId: vehicle.customerId,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };
  }
}
