import { inject, injectable } from 'inversify';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { CustomerRepository } from '../../../domain/repositories/CustomerRepository.ts';
import type { ServiceOrderRepository } from '../../../domain/repositories/ServiceOrderRepository.ts';
import type { VehicleRepository } from '../../../domain/repositories/VehicleRepository.ts';
import { TaxDocument } from '../../../domain/value-objects/TaxDocument.ts';
import type { TrackServiceOrderQuery } from '../../dto/inputs/TrackServiceOrderInput.ts';
import type { TrackingOutput } from '../../dto/outputs/TrackingOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';

/**
 * Acompanhamento pelo cliente, sem login: o id da OS so responde junto com o CPF/CNPJ do dono.
 * OS inexistente e documento de outro cliente dao a mesma resposta, para nao revelar quais ids existem.
 */
@injectable()
export class TrackServiceOrderUseCase {
  constructor(
    @inject(TYPES.ServiceOrderRepository)
    private readonly orderRepository: ServiceOrderRepository,
    @inject(TYPES.CustomerRepository)
    private readonly customerRepository: CustomerRepository,
    @inject(TYPES.VehicleRepository)
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(id: ServiceOrderId, query: TrackServiceOrderQuery): Promise<TrackingOutput> {
    const order = await this.orderRepository.findById(id);
    const customer = order ? await this.customerRepository.findById(order.customerId) : null;

    if (!order || !customer?.document.equals(TaxDocument.create(query.document))) {
      throw new NotFoundError('Ordem de Servico');
    }

    const vehicle = await this.vehicleRepository.findById(order.vehicleId);

    if (!vehicle) {
      throw new NotFoundError('Ordem de Servico');
    }

    return ServiceOrderResponseMapper.toTracking(order, vehicle);
  }
}
