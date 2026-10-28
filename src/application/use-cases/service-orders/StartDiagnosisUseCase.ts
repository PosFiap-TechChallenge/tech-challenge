import { inject, injectable } from 'inversify';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type { ServiceOrderOutput } from '../../dto/outputs/ServiceOrderOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ServiceOrderResponseMapper } from '../../mappers/ServiceOrderResponseMapper.ts';
import type { ServiceOrderCommandRunner } from '../../services/ServiceOrderCommandRunner.ts';

/** Iniciar diagnostico: a OS Recebida passa a Em diagnostico. */
@injectable()
export class StartDiagnosisUseCase {
  constructor(
    @inject(TYPES.ServiceOrderCommandRunner)
    private readonly commandRunner: ServiceOrderCommandRunner,
  ) {}

  async execute(id: ServiceOrderId): Promise<ServiceOrderOutput> {
    const order = await this.commandRunner.run(id, (target) => target.startDiagnosis());

    return ServiceOrderResponseMapper.toResponse(order);
  }
}
