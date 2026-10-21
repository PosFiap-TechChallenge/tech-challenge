import { beforeEach, describe, expect, it } from 'vitest';
import type { VehicleId } from '../../../domain/aggregates/Vehicle.ts';
import { makeVehicle, VEHICLE_ID } from '../../../domain/test/mocks/VehicleMock.ts';
import { makeVehicleRepositoryMock } from '../../../domain/test/mocks/VehicleRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { GetVehicleByIdUseCase } from './GetVehicleByIdUseCase.ts';

describe('GetVehicleByIdUseCase', () => {
  const vehicleRepository = makeVehicleRepositoryMock();
  const useCase = new GetVehicleByIdUseCase(vehicleRepository);

  beforeEach(() => {
    vehicleRepository.findById.mockReset();
  });

  it('retorna o veiculo encontrado', async () => {
    vehicleRepository.findById.mockResolvedValue(makeVehicle());

    const output = await useCase.execute(VEHICLE_ID as VehicleId);

    expect(output).toMatchObject({ id: VEHICLE_ID, plate: 'ABC1D23', brand: 'Fiat' });
  });

  it('rejeita com NotFoundError quando o veiculo nao existe', async () => {
    vehicleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(VEHICLE_ID as VehicleId)).rejects.toBeInstanceOf(NotFoundError);
  });
});
