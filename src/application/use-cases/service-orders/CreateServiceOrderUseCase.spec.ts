import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { makeEventPublisherMock } from '../../../domain/test/mocks/PartRepositoryMock.ts';
import {
  makeServiceOrderRepositoryMock,
  makeUnitOfWorkMock,
} from '../../../domain/test/mocks/ServiceOrderRepositoryMock.ts';
import { makeVehicle, VEHICLE_ID } from '../../../domain/test/mocks/VehicleMock.ts';
import { makeVehicleRepositoryMock } from '../../../domain/test/mocks/VehicleRepositoryMock.ts';
import { BadRequestError, NotFoundError } from '../../exceptions/AppError.ts';
import { CreateServiceOrderUseCase } from './CreateServiceOrderUseCase.ts';

const OTHER_CUSTOMER_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

const known = { customerDocument: '52998224725', vehicle: { plate: 'ABC1D23' } };
const fresh = {
  customerDocument: '52998224725',
  vehicle: { plate: 'DEF4567', brand: 'Fiat', model: 'Argo', year: 2022 },
};

describe('CreateServiceOrderUseCase', () => {
  const unitOfWork = makeUnitOfWorkMock();
  const customerRepository = makeCustomerRepositoryMock();
  const vehicleRepository = makeVehicleRepositoryMock();
  const orderRepository = makeServiceOrderRepositoryMock();
  const eventPublisher = makeEventPublisherMock();
  const useCase = new CreateServiceOrderUseCase(
    unitOfWork,
    customerRepository,
    vehicleRepository,
    orderRepository,
    eventPublisher,
  );

  function publishedNames(): string[] {
    return eventPublisher.publish.mock.calls.flatMap(([events]) =>
      events.map((event) => event.name),
    );
  }

  beforeEach(() => {
    unitOfWork.run.mockClear();
    customerRepository.findByDocument.mockReset();
    vehicleRepository.findByPlate.mockReset();
    vehicleRepository.create.mockReset();
    orderRepository.create.mockReset();
    eventPublisher.publish.mockReset();
    customerRepository.findByDocument.mockResolvedValue(makeCustomer());
  });

  it('abre a OS Recebida para o veiculo ja cadastrado do cliente', async () => {
    vehicleRepository.findByPlate.mockResolvedValue(makeVehicle());

    const output = await useCase.execute(known);

    expect(output).toMatchObject({ status: 'RECEIVED', vehicleId: VEHICLE_ID, total: 0 });
    expect(output.history).toHaveLength(1);
    expect(vehicleRepository.create).not.toHaveBeenCalled();
    expect(orderRepository.create).toHaveBeenCalledOnce();
    expect(publishedNames()).toEqual(['ServiceOrderCreatedEvent']);
  });

  it('identifica o cliente pelo documento informado, sem mascara', async () => {
    vehicleRepository.findByPlate.mockResolvedValue(makeVehicle());

    await useCase.execute(known);

    expect(customerRepository.findByDocument).toHaveBeenCalledWith(
      expect.objectContaining({ value: '52998224725' }),
    );
  });

  it('cadastra o veiculo novo na mesma unidade de trabalho da OS', async () => {
    vehicleRepository.findByPlate.mockResolvedValue(null);

    const output = await useCase.execute(fresh);

    expect(unitOfWork.run).toHaveBeenCalledOnce();
    expect(vehicleRepository.create).toHaveBeenCalledOnce();
    expect(vehicleRepository.create.mock.calls[0]?.[0]).toMatchObject({
      brand: 'Fiat',
      model: 'Argo',
      year: 2022,
    });
    expect(orderRepository.create.mock.calls[0]?.[0].vehicleId).toBe(output.vehicleId);
    expect(publishedNames()).toEqual(['VehicleRegisteredEvent', 'ServiceOrderCreatedEvent']);
  });

  it('rejeita veiculo novo sem marca, modelo e ano, e nao grava nada', async () => {
    vehicleRepository.findByPlate.mockResolvedValue(null);

    await expect(
      useCase.execute({ customerDocument: '52998224725', vehicle: { plate: 'DEF4567' } }),
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(vehicleRepository.create).not.toHaveBeenCalled();
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita veiculo que pertence a outro cliente', async () => {
    vehicleRepository.findByPlate.mockResolvedValue(makeVehicle({ customerId: OTHER_CUSTOMER_ID }));

    await expect(useCase.execute(known)).rejects.toMatchObject({
      code: 'VEHICLE_OWNED_BY_ANOTHER_CUSTOMER',
    });
    await expect(useCase.execute(known)).rejects.toBeInstanceOf(DomainError);
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita com NotFoundError quando nao ha cliente com o documento', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);

    await expect(useCase.execute(known)).rejects.toBeInstanceOf(NotFoundError);
    expect(unitOfWork.run).not.toHaveBeenCalled();
  });

  it('nao publica eventos quando a gravacao da OS falha', async () => {
    vehicleRepository.findByPlate.mockResolvedValue(null);
    orderRepository.create.mockRejectedValue(new Error('conexao perdida'));

    await expect(useCase.execute(fresh)).rejects.toThrow('conexao perdida');
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });
});
