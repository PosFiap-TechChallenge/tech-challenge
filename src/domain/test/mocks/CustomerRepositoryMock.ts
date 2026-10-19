import { vi, type Mocked } from 'vitest';
import type { CustomerRepository } from '../../repositories/CustomerRepository.ts';

export function makeCustomerRepositoryMock(): Mocked<CustomerRepository> {
  return {
    findById: vi.fn(),
    findByDocument: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
