import { vi, type Mocked } from 'vitest';
import type { ServiceRepository } from '../../repositories/ServiceRepository.ts';

export function makeServiceRepositoryMock(): Mocked<ServiceRepository> {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
