import { vi, type Mocked } from 'vitest';
import type { ServiceOrderRepository } from '../../repositories/ServiceOrderRepository.ts';
import type { UnitOfWork } from '../../providers/UnitOfWork.ts';

export function makeServiceOrderRepositoryMock(): Mocked<ServiceOrderRepository> {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    executionTimeStats: vi.fn(),
  };
}

/**
 * Unidade de trabalho que so executa o trabalho; os testes inspecionam `run` para ver o que ficou dentro dela.
 * O cast e necessario porque `Mocked` nao preserva o generico de `run<T>`.
 */
export function makeUnitOfWorkMock(): Mocked<UnitOfWork> {
  return { run: vi.fn(async (work) => work()) } as Mocked<UnitOfWork>;
}
