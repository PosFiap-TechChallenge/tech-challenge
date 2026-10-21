import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { CUSTOMER_ID, makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { makeVehicle } from '../../../domain/test/mocks/VehicleMock.ts';
import { makeVehicleRepositoryMock } from '../../../domain/test/mocks/VehicleRepositoryMock.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { CreateVehicleUseCase } from './CreateVehicleUseCase.ts';

describe('CreateVehicleUseCase', () => {
  const vehicleRepository = makeVehicleRepositoryMock();
  const customerRepository = makeCustomerRepositoryMock();
  const useCase = new CreateVehicleUseCase(vehicleRepository, customerRepository);

  const input = {
    plate: 'abc-1d23',
    brand: 'Fiat',
    model: 'Argo',
    year: 2022,
    customerId: CUSTOMER_ID,
  };

  beforeEach(() => {
    customerRepository.findById.mockReset();
    vehicleRepository.findByPlate.mockReset();
    vehicleRepository.create.mockReset();
  });

  it('cadastra o veiculo do cliente e retorna os dados normalizados', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());
    vehicleRepository.findByPlate.mockResolvedValue(null);

    const output = await useCase.execute(input);

    const createdVehicle = vehicleRepository.create.mock.calls[0]?.[0];

    expect(createdVehicle?.id).toBe(output.id);
    expect(vehicleRepository.findByPlate.mock.calls[0]?.[0].value).toBe('ABC1D23');
    expect(output).toMatchObject({
      plate: 'ABC1D23',
      brand: 'Fiat',
      model: 'Argo',
      year: 2022,
      customerId: CUSTOMER_ID,
    });
  });

  it('rejeita com NotFoundError quando o cliente nao existe', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(NotFoundError);
    expect(vehicleRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita com ConflictError quando a placa ja esta cadastrada', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());
    vehicleRepository.findByPlate.mockResolvedValue(makeVehicle());

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
    expect(vehicleRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita placa invalida antes de consultar os repositorios', async () => {
    await expect(useCase.execute({ ...input, plate: 'ABC123' })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(customerRepository.findById).not.toHaveBeenCalled();
    expect(vehicleRepository.findByPlate).not.toHaveBeenCalled();
  });

  it('rejeita ano invalido antes de consultar os repositorios', async () => {
    await expect(useCase.execute({ ...input, year: 1800 })).rejects.toBeInstanceOf(DomainError);
    expect(customerRepository.findById).not.toHaveBeenCalled();
  });

  it('propaga ConflictError do repositorio em cadastro concorrente', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());
    vehicleRepository.findByPlate.mockResolvedValue(null);
    vehicleRepository.create.mockRejectedValue(new ConflictError('Veiculo', 'placa'));

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
  });
});
