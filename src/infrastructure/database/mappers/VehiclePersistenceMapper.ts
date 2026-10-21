import type { Vehicle as VehicleRecord } from '@prisma/client';
import { Vehicle } from '../../../domain/aggregates/Vehicle.ts';

export class VehiclePersistenceMapper {
  static toDomain(record: VehicleRecord): Vehicle {
    return Vehicle.from({
      id: record.id,
      plate: record.plate,
      brand: record.brand,
      model: record.model,
      year: record.year,
      customerId: record.customerId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(vehicle: Vehicle): VehicleRecord {
    return {
      id: vehicle.id,
      plate: vehicle.plate.value,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      customerId: vehicle.customerId,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}
