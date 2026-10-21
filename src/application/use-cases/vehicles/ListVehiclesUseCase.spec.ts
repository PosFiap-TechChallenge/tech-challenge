import { beforeEach, describe, expect, it } from 'vitest';
import { CUSTOMER_ID } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeVehicle } from '../../../domain/test/mocks/VehicleMock.ts';
import { makeVehicleRepositoryMock } from '../../../domain/test/mocks/VehicleRepositoryMock.ts';
import { ListVehiclesUseCase } from './ListVehiclesUseCase.ts';

describe('ListVehiclesUseCase', () => {
  const vehicleRepository = makeVehicleRepositoryMock();
  const useCase = new ListVehiclesUseCase(vehicleRepository);

  beforeEach(() => {
    vehicleRepository.list.mockReset();
  });

  it('retorna a pagina com os metadados de paginacao', async () => {
    vehicleRepository.list.mockResolvedValue({ items: [makeVehicle()], total: 41 });

    const output = await useCase.execute({ page: 2, pageSize: 20 });

    expect(vehicleRepository.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      customerId: undefined,
    });
    expect(output).toMatchObject({ page: 2, pageSize: 20, total: 41, totalPages: 3 });
    expect(output.items).toHaveLength(1);
  });

  it('repassa o filtro por cliente ao repositorio', async () => {
    vehicleRepository.list.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, pageSize: 20, customerId: CUSTOMER_ID });

    expect(vehicleRepository.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      customerId: CUSTOMER_ID,
    });
  });

  it('retorna pagina vazia sem divisao por zero', async () => {
    vehicleRepository.list.mockResolvedValue({ items: [], total: 0 });

    const output = await useCase.execute({ page: 1, pageSize: 20 });

    expect(output).toMatchObject({ items: [], total: 0, totalPages: 0 });
  });
});
