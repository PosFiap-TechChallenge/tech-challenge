import type { Part, PartId } from '../../../domain/aggregates/Part.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { type StockItemsInput, stockItemsInputSchema } from '../../dto/inputs/StockItemsInput.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';
import type { PartCommandRunner } from './PartCommandRunner.ts';

/**
 * Aplica a mesma operacao de estoque a varias pecas, tudo ou nada. O erro de
 * dominio passa a indicar qual peca falhou, ja que o lote pode ter dezenas delas.
 */
export async function applyToStockItems(
  runner: PartCommandRunner,
  input: StockItemsInput,
  operation: (part: Part, quantity: number) => void,
): Promise<PartOutput[]> {
  const { items } = stockItemsInputSchema.parse(input);

  const parts = await runner.runBatch(
    items.map((item) => item.partId as PartId),
    (targets) => {
      targets.forEach((part, index) => {
        try {
          operation(part, (items[index] as StockItemsInput['items'][number]).quantity);
        } catch (error) {
          if (error instanceof DomainError) {
            throw new DomainError(`Peca ${part.code}: ${error.message}`, error.code);
          }

          throw error;
        }
      });
    },
    { retryOnConcurrentUpdate: true },
  );

  return parts.map((part) => PartResponseMapper.toResponse(part));
}
