import { beforeEach, describe, expect, it } from 'vitest';
import type { ServiceId } from '../../../domain/aggregates/Service.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makeService, SERVICE_ID } from '../../../domain/test/mocks/ServiceMock.ts';
import { makeServiceRepositoryMock } from '../../../domain/test/mocks/ServiceRepositoryMock.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { UpdateServiceUseCase } from './UpdateServiceUseCase.ts';

const serviceId = SERVICE_ID as ServiceId;
const OTHER_SERVICE_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('UpdateServiceUseCase', () => {
  const serviceRepository = makeServiceRepositoryMock();
  const useCase = new UpdateServiceUseCase(serviceRepository);

  beforeEach(() => {
    serviceRepository.findById.mockReset();
    serviceRepository.findByName.mockReset();
    serviceRepository.update.mockReset();
  });

  it('atualiza os campos informados e persiste', async () => {
    serviceRepository.findById.mockResolvedValue(makeService());

    const output = await useCase.execute(serviceId, { price: 150, estimatedMinutes: 50 });

    expect(serviceRepository.update).toHaveBeenCalledOnce();
    expect(serviceRepository.findByName).not.toHaveBeenCalled();
    expect(output).toMatchObject({ price: 150, estimatedMinutes: 50, name: 'Troca de oleo' });
  });

  it('permite trocar para um nome livre', async () => {
    serviceRepository.findById.mockResolvedValue(makeService());
    serviceRepository.findByName.mockResolvedValue(null);

    const output = await useCase.execute(serviceId, { name: ' Revisao completa ' });

    expect(serviceRepository.findByName).toHaveBeenCalledWith('Revisao completa');
    expect(output).toMatchObject({ id: SERVICE_ID, name: 'Revisao completa' });
  });

  it('permite reenviar o proprio nome', async () => {
    const service = makeService();
    serviceRepository.findById.mockResolvedValue(service);
    serviceRepository.findByName.mockResolvedValue(makeService());

    await useCase.execute(serviceId, { name: 'Troca de oleo' });

    expect(serviceRepository.update).toHaveBeenCalledWith(service);
  });

  it('rejeita com ConflictError quando o nome pertence a outro servico', async () => {
    serviceRepository.findById.mockResolvedValue(makeService());
    serviceRepository.findByName.mockResolvedValue(
      makeService({ id: OTHER_SERVICE_ID, name: 'Alinhamento' }),
    );

    await expect(useCase.execute(serviceId, { name: 'Alinhamento' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(serviceRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita com NotFoundError quando o servico nao existe', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(serviceId, { price: 10 })).rejects.toBeInstanceOf(NotFoundError);
    expect(serviceRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita dados invalidos sem persistir', async () => {
    serviceRepository.findById.mockResolvedValue(makeService());

    await expect(useCase.execute(serviceId, { estimatedMinutes: 0 })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(serviceRepository.update).not.toHaveBeenCalled();
  });
});
