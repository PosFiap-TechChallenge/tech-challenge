import { Vehicle } from '../../aggregates/Vehicle.ts';
import type { VehicleData } from '../../schemas/VehicleSchema.ts';
import { CUSTOMER_ID } from './CustomerMock.ts';

export const VEHICLE_ID = '3d9e8f7a-6b5c-4d4e-8f3a-2b1c0d9e8f7a';

export function makeVehicle(overrides: Partial<VehicleData> = {}): Vehicle {
  return Vehicle.from({
    id: VEHICLE_ID,
    plate: 'ABC1D23',
    brand: 'Fiat',
    model: 'Argo',
    year: 2022,
    customerId: CUSTOMER_ID,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}
