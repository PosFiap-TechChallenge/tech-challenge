import { vi, type Mocked } from 'vitest';
import type { EventPublisher } from '../../providers/EventPublisher.ts';
import type { PartRepository } from '../../repositories/PartRepository.ts';

export function makePartRepositoryMock(): Mocked<PartRepository> {
  return {
    findById: vi.fn(),
    findByCode: vi.fn(),
    list: vi.fn(),
    listMovements: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateAll: vi.fn(),
    hasStockHistory: vi.fn(),
    delete: vi.fn(),
  };
}

export function makeEventPublisherMock(): Mocked<EventPublisher> {
  return {
    publish: vi.fn(),
  };
}
