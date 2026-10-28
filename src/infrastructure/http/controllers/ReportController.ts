import type { Response } from 'express';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import type { GetAverageExecutionTimeUseCase } from '../../../application/use-cases/service-orders/GetAverageExecutionTimeUseCase.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { Auth, type AuthenticatedRequest } from '../routing/Auth.ts';
import { Route } from '../routing/Route.ts';

/** Monitoramento da gestao: so o administrador consulta. */
@injectable()
@Auth(UserRole.ADMIN)
export class ReportController {
  constructor(
    @inject(TYPES.GetAverageExecutionTimeUseCase)
    private readonly getAverageExecutionTimeUseCase: GetAverageExecutionTimeUseCase,
  ) {}

  @Route('get', '/reports/execution-time')
  async executionTime(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const output = await this.getAverageExecutionTimeUseCase.execute();

    res.status(200).json(output);
  }
}
