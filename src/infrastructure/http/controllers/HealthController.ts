import type { Request, Response, Router } from 'express';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import type { GetHealthUseCase } from '../../../application/use-cases/GetHealthUseCase.ts';

@injectable()
export class HealthController {
  constructor(
    @inject(TYPES.GetHealthUseCase)
    private readonly getHealthUseCase: GetHealthUseCase,
  ) {}

  register(router: Router): void {
    router.get('/health', this.handle);
  }

  private readonly handle = (_req: Request, res: Response): void => {
    const health = this.getHealthUseCase.execute();

    res.status(200).json(health);
  };
}
