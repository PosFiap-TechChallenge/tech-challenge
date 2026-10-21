import { beforeEach, describe, expect, it } from 'vitest';
import type { VehicleId } from '../../../domain/aggregates/Vehicle.ts';
import { makeVehicle, VEHICLE_ID } from '../../../domain/test/mocks/VehicleMock.ts';
import { makeVehicleRepositoryMock } from '../../../domain/test/mocks/VehicleRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { DeleteVehicleUseCase } from './DeleteVehicleUseCase.ts';

describe('DeleteVehicleUseCase', () => {
  const vehicleRepository = makeVehicleRepositoryMock();
  const useCase = new DeleteVehicleUseCase(vehicleRepository);

  beforeEach(() => {
    vehicleRepository.findById.mockReset();
    vehicleRepository.delete.mockReset();
  });

  it('remove o veiculo existente', async () => {
    vehicleRepository.findById.mockResolvedValue(makeVehicle());

    await useCase.execute(VEHICLE_ID as VehicleId);

    expect(vehicleRepository.delete).toHaveBeenCalledWith(VEHICLE_ID);
  });

  it('rejeita com NotFoundError quando o veiculo nao existe', async () => {
    vehicleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(VEHICLE_ID as VehicleId)).rejects.toBeInstanceOf(NotFoundError);
    expect(vehicleRepository.delete).not.toHaveBeenCalled();
  });
});
