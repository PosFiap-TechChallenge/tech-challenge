import { Vehicle, type VehicleId } from '../../aggregates/Vehicle.ts';
import type {
  VehicleListQuery,
  VehiclePage,
  VehicleRepository,
} from '../../repositories/VehicleRepository.ts';
import type { LicensePlate } from '../../value-objects/LicensePlate.ts';

function snapshot(vehicle: Vehicle): Vehicle {
  return Vehicle.from({
    id: vehicle.id,
    plate: vehicle.plate.value,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    customerId: vehicle.customerId,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  });
}

/** Fake para testes HTTP: guarda copias para que mutacoes nao persistidas nao vazem. */
export class InMemoryVehicleRepository implements VehicleRepository {
  private readonly vehicles = new Map<string, Vehicle>();

  async findById(id: VehicleId): Promise<Vehicle | null> {
    const vehicle = this.vehicles.get(id);

    return vehicle ? snapshot(vehicle) : null;
  }

  async findByPlate(plate: LicensePlate): Promise<Vehicle | null> {
    const vehicle = [...this.vehicles.values()].find((candidate) => candidate.plate.equals(plate));

    return vehicle ? snapshot(vehicle) : null;
  }

  async list({ page, pageSize, customerId }: VehicleListQuery): Promise<VehiclePage> {
    const ordered = [...this.vehicles.values()]
      .filter((vehicle) => customerId === undefined || vehicle.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * pageSize;

    return { items: ordered.slice(start, start + pageSize).map(snapshot), total: ordered.length };
  }

  async create(vehicle: Vehicle): Promise<void> {
    this.vehicles.set(vehicle.id, snapshot(vehicle));
  }

  async update(vehicle: Vehicle): Promise<void> {
    this.vehicles.set(vehicle.id, snapshot(vehicle));
  }

  async delete(id: VehicleId): Promise<void> {
    this.vehicles.delete(id);
  }

  clear(): void {
    this.vehicles.clear();
  }
}
