import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { createVehicleInputSchema } from '../../../application/dto/inputs/CreateVehicleInput.ts';
import { listVehiclesInputSchema } from '../../../application/dto/inputs/ListVehiclesInput.ts';
import { updateVehicleInputSchema } from '../../../application/dto/inputs/UpdateVehicleInput.ts';
import {
  vehicleIdParamsSchema,
  vehiclePlateParamsSchema,
} from '../../../application/dto/inputs/VehicleParams.ts';
import { TYPES } from '../../../application/dto/Types.ts';
import type { CreateVehicleUseCase } from '../../../application/use-cases/vehicles/CreateVehicleUseCase.ts';
import type { DeleteVehicleUseCase } from '../../../application/use-cases/vehicles/DeleteVehicleUseCase.ts';
import type { GetVehicleByIdUseCase } from '../../../application/use-cases/vehicles/GetVehicleByIdUseCase.ts';
import type { GetVehicleByPlateUseCase } from '../../../application/use-cases/vehicles/GetVehicleByPlateUseCase.ts';
import type { ListVehiclesUseCase } from '../../../application/use-cases/vehicles/ListVehiclesUseCase.ts';
import type { UpdateVehicleUseCase } from '../../../application/use-cases/vehicles/UpdateVehicleUseCase.ts';
import type { VehicleId } from '../../../domain/aggregates/Vehicle.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { Auth, type AuthenticatedRequest } from '../routing/Auth.ts';
import { Route } from '../routing/Route.ts';

function parseVehicleId(req: Request): VehicleId {
  return vehicleIdParamsSchema.parse(req.params).id as VehicleId;
}

@injectable()
@Auth(UserRole.ADMIN, UserRole.ATTENDANT)
export class VehicleController {
  constructor(
    @inject(TYPES.CreateVehicleUseCase)
    private readonly createVehicleUseCase: CreateVehicleUseCase,
    @inject(TYPES.GetVehicleByIdUseCase)
    private readonly getVehicleByIdUseCase: GetVehicleByIdUseCase,
    @inject(TYPES.GetVehicleByPlateUseCase)
    private readonly getVehicleByPlateUseCase: GetVehicleByPlateUseCase,
    @inject(TYPES.ListVehiclesUseCase)
    private readonly listVehiclesUseCase: ListVehiclesUseCase,
    @inject(TYPES.UpdateVehicleUseCase)
    private readonly updateVehicleUseCase: UpdateVehicleUseCase,
    @inject(TYPES.DeleteVehicleUseCase)
    private readonly deleteVehicleUseCase: DeleteVehicleUseCase,
  ) {}

  @Route('post', '/vehicles')
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = createVehicleInputSchema.parse(req.body);

    const output = await this.createVehicleUseCase.execute(input);

    res.status(201).location(`/vehicles/${output.id}`).json(output);
  }

  @Route('get', '/vehicles')
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = listVehiclesInputSchema.parse(req.query);

    const output = await this.listVehiclesUseCase.execute(input);

    res.status(200).json(output);
  }

  @Route('get', '/vehicles/plate/:plate')
  async getByPlate(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { plate } = vehiclePlateParamsSchema.parse(req.params);

    const output = await this.getVehicleByPlateUseCase.execute(plate);

    res.status(200).json(output);
  }

  @Route('get', '/vehicles/:id')
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const output = await this.getVehicleByIdUseCase.execute(parseVehicleId(req));

    res.status(200).json(output);
  }

  @Route('patch', '/vehicles/:id')
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parseVehicleId(req);
    const input = updateVehicleInputSchema.parse(req.body);

    const output = await this.updateVehicleUseCase.execute(id, input);

    res.status(200).json(output);
  }

  @Auth(UserRole.ADMIN)
  @Route('delete', '/vehicles/:id')
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.deleteVehicleUseCase.execute(parseVehicleId(req));

    res.status(204).send();
  }
}
