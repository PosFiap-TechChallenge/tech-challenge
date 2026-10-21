import { vi, type Mocked } from 'vitest';
import type { VehicleRepository } from '../../repositories/VehicleRepository.ts';

export function makeVehicleRepositoryMock(): Mocked<VehicleRepository> {
  return {
    findById: vi.fn(),
    findByPlate: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
