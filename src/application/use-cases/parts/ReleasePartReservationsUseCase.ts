import { inject, injectable } from 'inversify';
import type { StockItemsInput } from '../../dto/inputs/StockItemsInput.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import type { PartCommandRunner } from './PartCommandRunner.ts';
import { applyToStockItems } from './StockItemsBatch.ts';

/** Liberar Reservas: quando um orcamento aprovado e cancelado ou reprovado. */
@injectable()
export class ReleasePartReservationsUseCase {
  constructor(
    @inject(TYPES.PartCommandRunner)
    private readonly partCommandRunner: PartCommandRunner,
  ) {}

  async execute(input: StockItemsInput): Promise<PartOutput[]> {
    return applyToStockItems(this.partCommandRunner, input, (part, quantity) =>
      part.release(quantity),
    );
  }
}
