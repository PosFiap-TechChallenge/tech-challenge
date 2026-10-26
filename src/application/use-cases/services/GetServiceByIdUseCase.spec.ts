import { beforeEach, describe, expect, it } from 'vitest';
import type { ServiceId } from '../../../domain/aggregates/Service.ts';
import { makeService, SERVICE_ID } from '../../../domain/test/mocks/ServiceMock.ts';
import { makeServiceRepositoryMock } from '../../../domain/test/mocks/ServiceRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { GetServiceByIdUseCase } from './GetServiceByIdUseCase.ts';

describe('GetServiceByIdUseCase', () => {
  const serviceRepository = makeServiceRepositoryMock();
  const useCase = new GetServiceByIdUseCase(serviceRepository);

  beforeEach(() => {
    serviceRepository.findById.mockReset();
  });

  it('retorna o servico encontrado', async () => {
    serviceRepository.findById.mockResolvedValue(makeService());

    const output = await useCase.execute(SERVICE_ID as ServiceId);

    expect(output).toEqual({
      id: SERVICE_ID,
      name: 'Troca de oleo',
      price: 120,
      estimatedMinutes: 45,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('rejeita com NotFoundError quando o servico nao existe', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(SERVICE_ID as ServiceId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
