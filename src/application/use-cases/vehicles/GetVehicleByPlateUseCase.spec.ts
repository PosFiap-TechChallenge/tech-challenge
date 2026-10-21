import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makeVehicle } from '../../../domain/test/mocks/VehicleMock.ts';
import { makeVehicleRepositoryMock } from '../../../domain/test/mocks/VehicleRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { GetVehicleByPlateUseCase } from './GetVehicleByPlateUseCase.ts';

describe('GetVehicleByPlateUseCase', () => {
  const vehicleRepository = makeVehicleRepositoryMock();
  const useCase = new GetVehicleByPlateUseCase(vehicleRepository);

  beforeEach(() => {
    vehicleRepository.findByPlate.mockReset();
  });

  it('normaliza a placa e retorna o veiculo', async () => {
    vehicleRepository.findByPlate.mockResolvedValue(makeVehicle());

    const output = await useCase.execute('abc-1d23');

    expect(vehicleRepository.findByPlate.mock.calls[0]?.[0].value).toBe('ABC1D23');
    expect(output).toMatchObject({ plate: 'ABC1D23' });
  });

  it('rejeita com NotFoundError quando nao ha veiculo com a placa', async () => {
    vehicleRepository.findByPlate.mockResolvedValue(null);

    await expect(useCase.execute('ABC1D23')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita placa invalida sem consultar o repositorio', async () => {
    await expect(useCase.execute('123')).rejects.toBeInstanceOf(DomainError);
    expect(vehicleRepository.findByPlate).not.toHaveBeenCalled();
  });
});
