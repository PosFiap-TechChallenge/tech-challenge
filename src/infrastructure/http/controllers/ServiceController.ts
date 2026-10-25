import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { createServiceInputSchema } from '../../../application/dto/inputs/CreateServiceInput.ts';
import { listServicesInputSchema } from '../../../application/dto/inputs/ListServicesInput.ts';
import { serviceIdParamsSchema } from '../../../application/dto/inputs/ServiceParams.ts';
import { updateServiceInputSchema } from '../../../application/dto/inputs/UpdateServiceInput.ts';
import { TYPES } from '../../../application/dto/Types.ts';
import type { CreateServiceUseCase } from '../../../application/use-cases/services/CreateServiceUseCase.ts';
import type { DeleteServiceUseCase } from '../../../application/use-cases/services/DeleteServiceUseCase.ts';
import type { GetServiceByIdUseCase } from '../../../application/use-cases/services/GetServiceByIdUseCase.ts';
import type { ListServicesUseCase } from '../../../application/use-cases/services/ListServicesUseCase.ts';
import type { UpdateServiceUseCase } from '../../../application/use-cases/services/UpdateServiceUseCase.ts';
import type { ServiceId } from '../../../domain/aggregates/Service.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { Auth, type AuthenticatedRequest } from '../routing/Auth.ts';
import { Route } from '../routing/Route.ts';

function parseServiceId(req: Request): ServiceId {
  return serviceIdParamsSchema.parse(req.params).id as ServiceId;
}

/**
 * O catalogo (precos e tempos) e mantido pelo administrador; qualquer usuario
 * autenticado consulta, pois atendentes e mecanicos o usam ao montar a Ordem de Servico.
 */
@injectable()
@Auth(UserRole.ADMIN)
export class ServiceController {
  constructor(
    @inject(TYPES.CreateServiceUseCase)
    private readonly createServiceUseCase: CreateServiceUseCase,
    @inject(TYPES.GetServiceByIdUseCase)
    private readonly getServiceByIdUseCase: GetServiceByIdUseCase,
    @inject(TYPES.ListServicesUseCase)
    private readonly listServicesUseCase: ListServicesUseCase,
    @inject(TYPES.UpdateServiceUseCase)
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    @inject(TYPES.DeleteServiceUseCase)
    private readonly deleteServiceUseCase: DeleteServiceUseCase,
  ) {}

  @Route('post', '/services')
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = createServiceInputSchema.parse(req.body);

    const output = await this.createServiceUseCase.execute(input);

    res.status(201).location(`/services/${output.id}`).json(output);
  }

  @Auth()
  @Route('get', '/services')
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = listServicesInputSchema.parse(req.query);

    const output = await this.listServicesUseCase.execute(input);

    res.status(200).json(output);
  }

  @Auth()
  @Route('get', '/services/:id')
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const output = await this.getServiceByIdUseCase.execute(parseServiceId(req));

    res.status(200).json(output);
  }

  @Route('patch', '/services/:id')
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parseServiceId(req);
    const input = updateServiceInputSchema.parse(req.body);

    const output = await this.updateServiceUseCase.execute(id, input);

    res.status(200).json(output);
  }

  @Route('delete', '/services/:id')
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.deleteServiceUseCase.execute(parseServiceId(req));

    res.status(204).send();
  }
}
