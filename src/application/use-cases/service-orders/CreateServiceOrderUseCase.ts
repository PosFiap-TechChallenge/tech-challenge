import { inject, injectable } from 'inversify';
import type { Customer } from '../../../domain/aggregates/Customer.ts';
import { ServiceOrder } from '../../../domain/aggregates/ServiceOrder.ts';
import { Vehicle } from '../../../domain/aggregates/Vehicle.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import type { EventPublisher } from '../../../domain/providers/EventPublisher.ts';
import type { UnitOfWork } from '../../../domain/providers/UnitOfWork.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { ServiceOrderRepository } from '../../../domain/repositories/ServiceOrderRepository.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import { LicensePlate } from '../../../domain/value-objects/LicensePlate.ts';
import { TaxDocument } from '../../../domain/value-objects/TaxDocument.ts';
import type { CreateServiceOrderInput } from '../../dto/inputs/CreateServiceOrderInput.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { BadRequestError, NotFoundError } from '../../exceptions/AppError.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';

type VehicleData = CreateServiceOrderInput['vehicle'];

/**
 * Criar a OS: identifica o cliente por CPF/CNPJ e o veiculo pela placa. Veiculo ainda
 * nao cadastrado e registrado na mesma transacao da OS, para nao sobrar veiculo sem OS.
 */
@injectable()
export class CreateServiceOrderUseCase {
  constructor(
    @inject(TYPES.UnitOfWork)
    private readonly unitOfWork: UnitOfWork,
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
    @inject(TYPES.VehicleRepository)
    private readonly vehicleRepository: VehicleRepository,
    @inject(TYPES.ServiceOrderRepository)
    private readonly orderRepository: ServiceOrderRepository,
    @inject(TYPES.EventPublisher)
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CreateServiceOrderInput): Promise<ServiceOrderOutput> {
    const customer = await this.customerRepository.findByDocument(
      TaxDocument.create(input.customerDocument),
    );

    if (!customer) {
      throw new NotFoundError('Cliente');
    }

    const { order, vehicle } = await this.unitOfWork.run(async () => {
      const vehicle = await this.identifyVehicle(customer, input.vehicle);
      const order = ServiceOrder.create({ customerId: customer.id, vehicleId: vehicle.id });

      await this.orderRepository.create(order);

      return { order, vehicle };
    });

    await this.eventPublisher.publish([...vehicle.raisedEvents, ...order.raisedEvents]);

    return ServiceOrderResponseMapper.toResponse(order);
  }

  private async identifyVehicle(customer: Customer, data: VehicleData): Promise<Vehicle> {
    const existing = await this.vehicleRepository.findByPlate(LicensePlate.create(data.plate));

    if (existing) {
      return this.requireOwnedBy(customer, existing);
    }

    return this.registerVehicle(customer, data);
  }

  private requireOwnedBy(customer: Customer, vehicle: Vehicle): Vehicle {
    if (vehicle.customerId !== customer.id) {
      throw new DomainError(
        'Veiculo pertence a outro cliente',
        'VEHICLE_OWNED_BY_ANOTHER_CUSTOMER',
      );
    }

    return vehicle;
  }

  private async registerVehicle(customer: Customer, data: VehicleData): Promise<Vehicle> {
    const { plate, brand, model, year } = data;

    if (brand === undefined || model === undefined || year === undefined) {
      throw new BadRequestError('Veiculo nao cadastrado: informe marca, modelo e ano');
    }

    const vehicle = Vehicle.create({ plate, brand, model, year, customerId: customer.id });

    await this.vehicleRepository.create(vehicle);

    return vehicle;
  }
}
