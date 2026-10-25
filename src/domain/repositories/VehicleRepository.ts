import type { Vehicle, VehicleId } from '../aggregates/Vehicle.ts';
import type { LicensePlate } from '../value-objects/LicensePlate.ts';

export type VehicleListQuery = {
  page: number;
  pageSize: number;
  customerId?: string | undefined;
};

export type VehiclePage = {
  items: Vehicle[];
  total: number;
};

export interface VehicleRepository {
  findById(id: VehicleId): Promise<Vehicle | null>;
  findByPlate(plate: LicensePlate): Promise<Vehicle | null>;
  list(query: VehicleListQuery): Promise<VehiclePage>;
  create(vehicle: Vehicle): Promise<void>;
  update(vehicle: Vehicle): Promise<void>;
  delete(id: VehicleId): Promise<void>;
}
