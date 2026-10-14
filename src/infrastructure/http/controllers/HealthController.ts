import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import type { GetHealthUseCase } from '../../../application/use-cases/GetHealthUseCase.ts';
import { Route } from '../routing/Route.ts';

@injectable()
export class HealthController {
  constructor(
    @inject(TYPES.GetHealthUseCase)
    private readonly getHealthUseCase: GetHealthUseCase,
  ) {}

  @Route('get', '/health')
  health(_req: Request, res: Response): void {
    const health = this.getHealthUseCase.execute();

    res.status(200).json(health);
  }
}
