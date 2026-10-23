import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { adjustStockInputSchema } from '../../../application/dto/inputs/AdjustStockInput.ts';
import { createPartInputSchema } from '../../../application/dto/inputs/CreatePartInput.ts';
import { listPartsInputSchema } from '../../../application/dto/inputs/ListPartsInput.ts';
import { listStockMovementsInputSchema } from '../../../application/dto/inputs/ListStockMovementsInput.ts';
import { partIdParamsSchema } from '../../../application/dto/inputs/PartParams.ts';
import { updatePartInputSchema } from '../../../application/dto/inputs/UpdatePartInput.ts';
import { registerStockEntryInputSchema } from '../../../application/dto/inputs/RegisterStockEntryInput.ts';
import { TYPES } from '../../../application/dto/Types.ts';
import type { AdjustStockUseCase } from '../../../application/use-cases/parts/AdjustStockUseCase.ts';
import type { CreatePartUseCase } from '../../../application/use-cases/parts/CreatePartUseCase.ts';
import type { DeletePartUseCase } from '../../../application/use-cases/parts/DeletePartUseCase.ts';
import type { GetPartByIdUseCase } from '../../../application/use-cases/parts/GetPartByIdUseCase.ts';
import type { ListPartsUseCase } from '../../../application/use-cases/parts/ListPartsUseCase.ts';
import type { ListStockMovementsUseCase } from '../../../application/use-cases/parts/ListStockMovementsUseCase.ts';
import type { RegisterStockEntryUseCase } from '../../../application/use-cases/parts/RegisterStockEntryUseCase.ts';
import type { UpdatePartUseCase } from '../../../application/use-cases/parts/UpdatePartUseCase.ts';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { Auth, type AuthenticatedRequest } from '../routing/Auth.ts';
import { Route } from '../routing/Route.ts';

function parsePartId(req: Request): PartId {
  return partIdParamsSchema.parse(req.params).id as PartId;
}

/**
 * Cadastro, edicao, entrada e ajuste sao comandos do administrador. Reserva,
 * liberacao e consumo nao tem rota: sao disparados pelas politicas de orcamento
 * (aprovado, cancelado) e de servico concluido.
 */
@injectable()
@Auth(UserRole.ADMIN)
export class PartController {
  constructor(
    @inject(TYPES.CreatePartUseCase)
    private readonly createPartUseCase: CreatePartUseCase,
    @inject(TYPES.GetPartByIdUseCase)
    private readonly getPartByIdUseCase: GetPartByIdUseCase,
    @inject(TYPES.ListPartsUseCase)
    private readonly listPartsUseCase: ListPartsUseCase,
    @inject(TYPES.ListStockMovementsUseCase)
    private readonly listStockMovementsUseCase: ListStockMovementsUseCase,
    @inject(TYPES.RegisterStockEntryUseCase)
    private readonly registerStockEntryUseCase: RegisterStockEntryUseCase,
    @inject(TYPES.AdjustStockUseCase)
    private readonly adjustStockUseCase: AdjustStockUseCase,
    @inject(TYPES.UpdatePartUseCase)
    private readonly updatePartUseCase: UpdatePartUseCase,
    @inject(TYPES.DeletePartUseCase)
    private readonly deletePartUseCase: DeletePartUseCase,
  ) {}

  @Route('post', '/parts')
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = createPartInputSchema.parse(req.body);

    const output = await this.createPartUseCase.execute(input);

    res.status(201).location(`/parts/${output.id}`).json(output);
  }

  @Auth()
  @Route('get', '/parts')
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = listPartsInputSchema.parse(req.query);

    const output = await this.listPartsUseCase.execute(input);

    res.status(200).json(output);
  }

  @Auth()
  @Route('get', '/parts/:id')
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const output = await this.getPartByIdUseCase.execute(parsePartId(req));

    res.status(200).json(output);
  }

  @Auth()
  @Route('get', '/parts/:id/movements')
  async listMovements(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parsePartId(req);
    const input = listStockMovementsInputSchema.parse(req.query);

    const output = await this.listStockMovementsUseCase.execute(id, input);

    res.status(200).json(output);
  }

  @Route('post', '/parts/:id/entries')
  async registerEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parsePartId(req);
    const input = registerStockEntryInputSchema.parse(req.body);

    const output = await this.registerStockEntryUseCase.execute(id, input);

    res.status(200).json(output);
  }

  @Route('post', '/parts/:id/adjustments')
  async adjust(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parsePartId(req);
    const input = adjustStockInputSchema.parse(req.body);

    const output = await this.adjustStockUseCase.execute(id, input);

    res.status(200).json(output);
  }

  @Route('patch', '/parts/:id')
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = parsePartId(req);
    const input = updatePartInputSchema.parse(req.body);

    const output = await this.updatePartUseCase.execute(id, input);

    res.status(200).json(output);
  }

  @Route('delete', '/parts/:id')
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.deletePartUseCase.execute(parsePartId(req));

    res.status(204).send();
  }
}
