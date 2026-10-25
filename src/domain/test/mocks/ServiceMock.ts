import { Service } from '../../aggregates/Service.ts';
import type { ServiceData } from '../../schemas/ServiceSchema.ts';

export const SERVICE_ID = '5b4a3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d';

export function makeService(overrides: Partial<ServiceData> = {}): Service {
  return Service.from({
    id: SERVICE_ID,
    name: 'Troca de oleo',
    price: 120,
    estimatedMinutes: 45,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}
