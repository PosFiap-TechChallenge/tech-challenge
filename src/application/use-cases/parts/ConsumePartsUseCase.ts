import { inject, injectable } from 'inversify';
import type { StockItemsInput } from '../../dto/inputs/StockItemsInput.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import type { PartCommandRunner } from './PartCommandRunner.ts';
import { applyToStockItems } from './StockItemsBatch.ts';

/** Consumir Pecas: politica "sempre que concluir servico, consumir pecas". Baixa saldo e reserva de todos os itens juntos. */
@injectable()
export class ConsumePartsUseCase {
  constructor(
    @inject(TYPES.PartCommandRunner)
    private readonly partCommandRunner: PartCommandRunner,
  ) {}

  async execute(input: StockItemsInput): Promise<PartOutput[]> {
    return applyToStockItems(this.partCommandRunner, input, (part, quantity) =>
      part.consume(quantity),
    );
  }
}
