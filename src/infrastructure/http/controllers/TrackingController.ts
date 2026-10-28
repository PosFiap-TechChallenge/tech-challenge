import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { trackServiceOrderQuerySchema } from '../../../application/dto/inputs/TrackServiceOrderInput.ts';
import { TYPES } from '../../../application/dto/Types.ts';
import type { TrackServiceOrderUseCase } from '../../../application/use-cases/service-orders/TrackServiceOrderUseCase.ts';
import { Route } from '../routing/Route.ts';
import { parseOrderId } from './ServiceOrderParams.ts';

/** Rota publica (sem JWT): o cliente acompanha a propria OS informando o id e o CPF/CNPJ. */
@injectable()
export class TrackingController {
  constructor(
    @inject(TYPES.TrackServiceOrderUseCase)
    private readonly trackServiceOrderUseCase: TrackServiceOrderUseCase,
  ) {}

  @Route('get', '/tracking/:id')
  async track(req: Request, res: Response): Promise<void> {
    const id = parseOrderId(req);
    const query = trackServiceOrderQuerySchema.parse(req.query);

    const output = await this.trackServiceOrderUseCase.execute(id, query);

    res.status(200).json(output);
  }
}
