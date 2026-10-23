import { inject, injectable } from 'inversify';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import type { AdjustStockInput } from '../../dto/inputs/AdjustStockInput.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';
import type { PartCommandRunner } from './PartCommandRunner.ts';

/** Ajustar Estoque: substitui o saldo fisico pela quantidade contada, com motivo. Sem retentativa: a contagem foi feita sobre o saldo lido; se ele mudou, o administrador deve recontar. */
@injectable()
export class AdjustStockUseCase {
  constructor(
    @inject(TYPES.PartCommandRunner)
    private readonly partCommandRunner: PartCommandRunner,
  ) {}

  async execute(id: PartId, input: AdjustStockInput): Promise<PartOutput> {
    const part = await this.partCommandRunner.run(
      id,
      (target) => target.adjust(input.quantity, input.reason),
      {
        retryOnConcurrentUpdate: false,
      },
    );

    return PartResponseMapper.toResponse(part);
  }
}
