import type { Vehicle as VehicleRecord } from '@prisma/client';
import { Vehicle } from '../../../domain/aggregates/Vehicle.ts';

export class VehiclePersistenceMapper {
  static toDomain(record: VehicleRecord): Vehicle {
    return Vehicle.from(record);
  }

  static toPersistence(vehicle: Vehicle): VehicleRecord {
    return vehicle.toData();
  }
}
