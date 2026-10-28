import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import type { ServiceOrderOutput } from '../../../application/dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../../application/dto/Types.ts';
import type { ApproveBudgetUseCase } from '../../../application/use-cases/service-orders/ApproveBudgetUseCase.ts';
import type { DeliverVehicleUseCase } from '../../../application/use-cases/service-orders/DeliverVehicleUseCase.ts';
import type { FinishServiceUseCase } from '../../../application/use-cases/service-orders/FinishServiceUseCase.ts';
import type { RejectBudgetUseCase } from '../../../application/use-cases/service-orders/RejectBudgetUseCase.ts';
import type { SendBudgetUseCase } from '../../../application/use-cases/service-orders/SendBudgetUseCase.ts';
import type { StartDiagnosisUseCase } from '../../../application/use-cases/service-orders/StartDiagnosisUseCase.ts';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { Auth, type AuthenticatedRequest } from '../routing/Auth.ts';
import { Route } from '../routing/Route.ts';
import { parseOrderId } from './ServiceOrderParams.ts';

type OrderCommand = { execute(id: ServiceOrderId): Promise<ServiceOrderOutput> };

async function respond(req: Request, res: Response, command: OrderCommand): Promise<void> {
  const output = await command.execute(parseOrderId(req));

  res.status(200).json(output);
}

/**
 * Comandos de acompanhamento da OS. Nao ha rota para escolher o status: cada comando e
 * uma transicao validada pelo dominio. Diagnostico e conclusao sao do mecanico; orcamento
 * e entrega sao do atendente, que registra a decisao do cliente. ADMIN faz tudo.
 */
@injectable()
export class ServiceOrderWorkflowController {
  constructor(
    @inject(TYPES.StartDiagnosisUseCase)
    private readonly startDiagnosisUseCase: StartDiagnosisUseCase,
    @inject(TYPES.SendBudgetUseCase)
    private readonly sendBudgetUseCase: SendBudgetUseCase,
    @inject(TYPES.ApproveBudgetUseCase)
    private readonly approveBudgetUseCase: ApproveBudgetUseCase,
    @inject(TYPES.RejectBudgetUseCase)
    private readonly rejectBudgetUseCase: RejectBudgetUseCase,
    @inject(TYPES.FinishServiceUseCase)
    private readonly finishServiceUseCase: FinishServiceUseCase,
    @inject(TYPES.DeliverVehicleUseCase)
    private readonly deliverVehicleUseCase: DeliverVehicleUseCase,
  ) {}

  @Auth(UserRole.ADMIN, UserRole.MECHANIC)
  @Route('post', '/service-orders/:id/diagnosis')
  async startDiagnosis(req: AuthenticatedRequest, res: Response): Promise<void> {
    await respond(req, res, this.startDiagnosisUseCase);
  }

  @Auth(UserRole.ADMIN, UserRole.ATTENDANT)
  @Route('post', '/service-orders/:id/budget/send')
  async sendBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
    await respond(req, res, this.sendBudgetUseCase);
  }

  @Auth(UserRole.ADMIN, UserRole.ATTENDANT)
  @Route('post', '/service-orders/:id/budget/approve')
  async approveBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
    await respond(req, res, this.approveBudgetUseCase);
  }

  @Auth(UserRole.ADMIN, UserRole.ATTENDANT)
  @Route('post', '/service-orders/:id/budget/reject')
  async rejectBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
    await respond(req, res, this.rejectBudgetUseCase);
  }

  @Auth(UserRole.ADMIN, UserRole.MECHANIC)
  @Route('post', '/service-orders/:id/finish')
  async finishService(req: AuthenticatedRequest, res: Response): Promise<void> {
    await respond(req, res, this.finishServiceUseCase);
  }

  @Auth(UserRole.ADMIN, UserRole.ATTENDANT)
  @Route('post', '/service-orders/:id/deliver')
  async deliverVehicle(req: AuthenticatedRequest, res: Response): Promise<void> {
    await respond(req, res, this.deliverVehicleUseCase);
  }
}
