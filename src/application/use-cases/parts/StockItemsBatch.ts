import type { Part, PartId } from '../../../domain/aggregates/Part.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { type StockItemsInput, stockItemsInputSchema } from '../../dto/inputs/StockItemsInput.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';
import type { PartCommandRunner } from './PartCommandRunner.ts';

type StockItem = StockItemsInput['items'][number];

/** Aplica a operacao a cada peca; o erro de dominio passa a indicar qual peca falhou. */
export function applyOperationToParts(
  parts: readonly Part[],
  items: readonly StockItem[],
  operation: (part: Part, quantity: number) => void,
): void {
  parts.forEach((part, index) => {
    try {
      operation(part, (items[index] as StockItem).quantity);
    } catch (error) {
      if (error instanceof DomainError) {
        throw new DomainError(`Peca ${part.code}: ${error.message}`, error.code);
      }

      throw error;
    }
  });
}

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
    (targets) => applyOperationToParts(targets, items, operation),
    { retryOnConcurrentUpdate: true },
  );

  return parts.map((part) => PartResponseMapper.toResponse(part));
}
