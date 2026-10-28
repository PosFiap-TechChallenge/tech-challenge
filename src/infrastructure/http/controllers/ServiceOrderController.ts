import type { Response } from 'express';
import { inject, injectable } from 'inversify';
import { createServiceOrderInputSchema } from '../../../application/dto/inputs/CreateServiceOrderInput.ts';
import { listServiceOrdersInputSchema } from '../../../application/dto/inputs/ListServiceOrdersInput.ts';
import {
  addOrderPartInputSchema,
  addOrderServiceInputSchema,
} from '../../../application/dto/inputs/ServiceOrderItemInputs.ts';
import { TYPES } from '../../../application/dto/Types.ts';
import type { AddPartToOrderUseCase } from '../../../application/use-cases/service-orders/AddPartToOrderUseCase.ts';
import type { AddServiceToOrderUseCase } from '../../../application/use-cases/service-orders/AddServiceToOrderUseCase.ts';
import type { CreateServiceOrderUseCase } from '../../../application/use-cases/service-orders/CreateServiceOrderUseCase.ts';
import type { GetServiceOrderByIdUseCase } from '../../../application/use-cases/service-orders/GetServiceOrderByIdUseCase.ts';
import type { ListServiceOrdersUseCase } from '../../../application/use-cases/service-orders/ListServiceOrdersUseCase.ts';
import type { RemovePartFromOrderUseCase } from '../../../application/use-cases/service-orders/RemovePartFromOrderUseCase.ts';
import type { RemoveServiceFromOrderUseCase } from '../../../application/use-cases/service-orders/RemoveServiceFromOrderUseCase.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { Auth, type AuthenticatedRequest } from '../routing/Auth.ts';
import { Route } from '../routing/Route.ts';
import { parseOrderId, parseOrderItem } from './ServiceOrderParams.ts';

/**
 * Abertura, consulta e montagem da OS. Qualquer usuario autenticado consulta e inclui servicos
 * e pecas (o diagnostico e do mecanico); so ADMIN e ATTENDANT abrem a OS.
 */
@injectable()
@Auth()
export class ServiceOrderController {
  constructor(
    @inject(TYPES.CreateServiceOrderUseCase)
    private readonly createServiceOrderUseCase: CreateServiceOrderUseCase,
    @inject(TYPES.GetServiceOrderByIdUseCase)
    private readonly getServiceOrderByIdUseCase: GetServiceOrderByIdUseCase,
    @inject(TYPES.ListServiceOrdersUseCase)
    private readonly listServiceOrdersUseCase: ListServiceOrdersUseCase,
    @inject(TYPES.AddServiceToOrderUseCase)
    private readonly addServiceToOrderUseCase: AddServiceToOrderUseCase,
    @inject(TYPES.RemoveServiceFromOrderUseCase)
    private readonly removeServiceFromOrderUseCase: RemoveServiceFromOrderUseCase,
    @inject(TYPES.AddPartToOrderUseCase)
    private readonly addPartToOrderUseCase: AddPartToOrderUseCase,
    @inject(TYPES.RemovePartFromOrderUseCase)
    private readonly removePartFromOrderUseCase: RemovePartFromOrderUseCase,
  ) {}

  @Auth(UserRole.ADMIN, UserRole.ATTENDANT)
  @Route('post', '/service-orders')
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = createServiceOrderInputSchema.parse(req.body);

    const output = await this.createServiceOrderUseCase.execute(input);

    res.status(201).location(`/service-orders/${output.id}`).json(output);
  }

  @Route('get', '/service-orders')
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = listServiceOrdersInputSchema.parse(req.query);

    const output = await this.listServiceOrdersUseCase.execute(input);

    res.status(200).json(output);
  }

  @Route('get', '/service-orders/:id')
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const output = await this.getServiceOrderByIdUseCase.execute(parseOrderId(req));

    res.status(200).json(output);
  }

  @Route('post', '/service-orders/:id/services')
  async addService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parseOrderId(req);
    const input = addOrderServiceInputSchema.parse(req.body);

    const output = await this.addServiceToOrderUseCase.execute(id, input);

    res.status(201).json(output);
  }

  @Route('delete', '/service-orders/:id/services/:itemId')
  async removeService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id, itemId } = parseOrderItem(req);

    const output = await this.removeServiceFromOrderUseCase.execute(id, itemId);

    res.status(200).json(output);
  }

  @Route('post', '/service-orders/:id/parts')
  async addPart(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parseOrderId(req);
    const input = addOrderPartInputSchema.parse(req.body);

    const output = await this.addPartToOrderUseCase.execute(id, input);

    res.status(201).json(output);
  }

  @Route('delete', '/service-orders/:id/parts/:itemId')
  async removePart(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id, itemId } = parseOrderItem(req);

    const output = await this.removePartFromOrderUseCase.execute(id, itemId);

    res.status(200).json(output);
  }
}
