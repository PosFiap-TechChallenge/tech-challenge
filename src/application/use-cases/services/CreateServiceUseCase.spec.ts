import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makeService } from '../../../domain/test/mocks/ServiceMock.ts';
import { makeServiceRepositoryMock } from '../../../domain/test/mocks/ServiceRepositoryMock.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { CreateServiceUseCase } from './CreateServiceUseCase.ts';

const input = { name: ' Alinhamento ', price: 89.9, estimatedMinutes: 60 };

describe('CreateServiceUseCase', () => {
  const serviceRepository = makeServiceRepositoryMock();
  const useCase = new CreateServiceUseCase(serviceRepository);

  beforeEach(() => {
    serviceRepository.findByName.mockReset();
    serviceRepository.create.mockReset();
  });

  it('cadastra o servico com os dados normalizados', async () => {
    serviceRepository.findByName.mockResolvedValue(null);

    const output = await useCase.execute(input);

    expect(serviceRepository.findByName).toHaveBeenCalledWith('Alinhamento');
    expect(serviceRepository.create).toHaveBeenCalledOnce();
    expect(output).toMatchObject({ name: 'Alinhamento', price: 89.9, estimatedMinutes: 60 });
    expect(output.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejeita com ConflictError quando o nome ja existe', async () => {
    serviceRepository.findByName.mockResolvedValue(makeService({ name: 'Alinhamento' }));

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
    expect(serviceRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita dados invalidos sem consultar nem gravar', async () => {
    await expect(useCase.execute({ ...input, price: -1 })).rejects.toBeInstanceOf(DomainError);
    expect(serviceRepository.findByName).not.toHaveBeenCalled();
    expect(serviceRepository.create).not.toHaveBeenCalled();
  });
});
