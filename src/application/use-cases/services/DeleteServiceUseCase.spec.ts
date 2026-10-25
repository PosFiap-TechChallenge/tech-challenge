import { beforeEach, describe, expect, it } from 'vitest';
import type { ServiceId } from '../../../domain/aggregates/Service.ts';
import { makeService, SERVICE_ID } from '../../../domain/test/mocks/ServiceMock.ts';
import { makeServiceRepositoryMock } from '../../../domain/test/mocks/ServiceRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { DeleteServiceUseCase } from './DeleteServiceUseCase.ts';

describe('DeleteServiceUseCase', () => {
  const serviceRepository = makeServiceRepositoryMock();
  const useCase = new DeleteServiceUseCase(serviceRepository);

  beforeEach(() => {
    serviceRepository.findById.mockReset();
    serviceRepository.delete.mockReset();
  });

  it('remove o servico existente', async () => {
    serviceRepository.findById.mockResolvedValue(makeService());

    await useCase.execute(SERVICE_ID as ServiceId);

    expect(serviceRepository.delete).toHaveBeenCalledWith(SERVICE_ID);
  });

  it('rejeita com NotFoundError quando o servico nao existe', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(SERVICE_ID as ServiceId)).rejects.toBeInstanceOf(NotFoundError);
    expect(serviceRepository.delete).not.toHaveBeenCalled();
  });
});
