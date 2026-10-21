import { beforeEach, describe, expect, it } from 'vitest';
import type { VehicleId } from '../../../domain/aggregates/Vehicle.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { makeVehicle, VEHICLE_ID } from '../../../domain/test/mocks/VehicleMock.ts';
import { makeVehicleRepositoryMock } from '../../../domain/test/mocks/VehicleRepositoryMock.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { UpdateVehicleUseCase } from './UpdateVehicleUseCase.ts';

const vehicleId = VEHICLE_ID as VehicleId;
const OTHER_CUSTOMER_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';
const OTHER_VEHICLE_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('UpdateVehicleUseCase', () => {
  const vehicleRepository = makeVehicleRepositoryMock();
  const customerRepository = makeCustomerRepositoryMock();
  const useCase = new UpdateVehicleUseCase(vehicleRepository, customerRepository);

  beforeEach(() => {
    vehicleRepository.findById.mockReset();
    vehicleRepository.findByPlate.mockReset();
    vehicleRepository.update.mockReset();
    customerRepository.findById.mockReset();
  });

  it('atualiza os campos informados e persiste', async () => {
    vehicleRepository.findById.mockResolvedValue(makeVehicle());

    const output = await useCase.execute(vehicleId, { model: 'Pulse', year: 2024 });

    expect(vehicleRepository.update).toHaveBeenCalledOnce();
    expect(vehicleRepository.findByPlate).not.toHaveBeenCalled();
    expect(customerRepository.findById).not.toHaveBeenCalled();
    expect(output).toMatchObject({ model: 'Pulse', year: 2024, brand: 'Fiat', plate: 'ABC1D23' });
  });

  it('permite trocar para uma placa livre', async () => {
    vehicleRepository.findById.mockResolvedValue(makeVehicle());
    vehicleRepository.findByPlate.mockResolvedValue(null);

    const output = await useCase.execute(vehicleId, { plate: 'def-4567' });

    expect(output).toMatchObject({ id: VEHICLE_ID, plate: 'DEF4567' });
  });

  it('permite reenviar a propria placa', async () => {
    const vehicle = makeVehicle();
    vehicleRepository.findById.mockResolvedValue(vehicle);
    vehicleRepository.findByPlate.mockResolvedValue(makeVehicle());

    await useCase.execute(vehicleId, { plate: 'abc1d23' });

    expect(vehicleRepository.update).toHaveBeenCalledWith(vehicle);
  });

  it('rejeita com ConflictError quando a placa pertence a outro veiculo', async () => {
    vehicleRepository.findById.mockResolvedValue(makeVehicle());
    vehicleRepository.findByPlate.mockResolvedValue(
      makeVehicle({ id: OTHER_VEHICLE_ID, plate: 'DEF4567' }),
    );

    await expect(useCase.execute(vehicleId, { plate: 'DEF4567' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('transfere o veiculo para outro cliente existente', async () => {
    vehicleRepository.findById.mockResolvedValue(makeVehicle());
    customerRepository.findById.mockResolvedValue(makeCustomer({ id: OTHER_CUSTOMER_ID }));

    const output = await useCase.execute(vehicleId, { customerId: OTHER_CUSTOMER_ID });

    expect(output).toMatchObject({ customerId: OTHER_CUSTOMER_ID });
    expect(vehicleRepository.update).toHaveBeenCalledOnce();
  });

  it('rejeita com NotFoundError ao transferir para cliente inexistente', async () => {
    vehicleRepository.findById.mockResolvedValue(makeVehicle());
    customerRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(vehicleId, { customerId: OTHER_CUSTOMER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita com NotFoundError quando o veiculo nao existe', async () => {
    vehicleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(vehicleId, { brand: 'Fiat' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita dados invalidos sem persistir', async () => {
    vehicleRepository.findById.mockResolvedValue(makeVehicle());

    await expect(useCase.execute(vehicleId, { year: 1800 })).rejects.toBeInstanceOf(DomainError);
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });
});
