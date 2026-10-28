import { beforeEach, describe, expect, it } from 'vitest';
import { makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { makeServiceOrderIn, ORDER_ID } from '../../../domain/test/mocks/ServiceOrderMock.ts';
import { makeServiceOrderRepositoryMock } from '../../../domain/test/mocks/ServiceOrderRepositoryMock.ts';
import { makeVehicle } from '../../../domain/test/mocks/VehicleMock.ts';
import { makeVehicleRepositoryMock } from '../../../domain/test/mocks/VehicleRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { TrackServiceOrderUseCase } from './TrackServiceOrderUseCase.ts';

describe('TrackServiceOrderUseCase', () => {
  const orderRepository = makeServiceOrderRepositoryMock();
  const customerRepository = makeCustomerRepositoryMock();
  const vehicleRepository = makeVehicleRepositoryMock();
  const useCase = new TrackServiceOrderUseCase(
    orderRepository,
    customerRepository,
    vehicleRepository,
  );
  const id = ORDER_ID;

  beforeEach(() => {
    orderRepository.findById.mockReset();
    customerRepository.findById.mockReset();
    vehicleRepository.findById.mockReset();
    orderRepository.findById.mockResolvedValue(makeServiceOrderIn('AWAITING_APPROVAL'));
    customerRepository.findById.mockResolvedValue(makeCustomer());
    vehicleRepository.findById.mockResolvedValue(makeVehicle());
  });

  it('mostra ao dono o andamento, o veiculo, os itens, o orcamento e a linha do tempo', async () => {
    const output = await useCase.execute(id, { document: '52998224725' });

    expect(output).toMatchObject({
      id: ORDER_ID,
      status: 'AWAITING_APPROVAL',
      vehicle: { plate: 'ABC1D23', brand: 'Fiat', model: 'Argo', year: 2022 },
      services: [{ name: 'Troca de oleo', price: 120, estimatedMinutes: 45 }],
      parts: [{ name: 'Filtro de oleo', unit: 'UN', quantity: 2, total: 51.8 }],
      total: 171.8,
      budget: { status: 'PENDING', total: 171.8 },
    });
    expect(output.timeline.map((change) => change.status)).toEqual([
      'RECEIVED',
      'IN_DIAGNOSIS',
      'AWAITING_APPROVAL',
    ]);
  });

  it('nao expõe dados do cliente nem identificadores internos', async () => {
    const output = await useCase.execute(id, { document: '52998224725' });

    expect(output).not.toHaveProperty('customerId');
    expect(output).not.toHaveProperty('vehicleId');
    expect(JSON.stringify(output)).not.toContain('52998224725');
    expect(JSON.stringify(output)).not.toContain('Joao');
  });

  it('responde NotFoundError igual para OS inexistente e para documento de outro cliente', async () => {
    orderRepository.findById.mockResolvedValueOnce(null);

    const missing = await useCase.execute(id, { document: '52998224725' }).catch((error) => error);
    const foreign = await useCase
      .execute(id, { document: '11222333000181' })
      .catch((error) => error);

    expect(missing).toBeInstanceOf(NotFoundError);
    expect(foreign).toBeInstanceOf(NotFoundError);
    expect(foreign.message).toBe(missing.message);
    expect(vehicleRepository.findById).not.toHaveBeenCalled();
  });
});
