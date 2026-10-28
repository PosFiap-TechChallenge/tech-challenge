import { inject, injectable } from 'inversify';
import type { Part, PartId } from '../../domain/aggregates/Part.ts';
import type { ServiceOrder } from '../../domain/aggregates/ServiceOrder.ts';
import { TYPES } from '../dto/Types.ts';
import type { PartCommandRunner } from '../use-cases/parts/PartCommandRunner.ts';
import { applyOperationToParts } from '../use-cases/parts/StockItemsBatch.ts';

/**
 * Contrato da OS com o estoque: reserva na aprovacao do orcamento e consumo na conclusao
 * do servico. Grava dentro da transacao em andamento (a da OS), sem publicar eventos:
 * as pecas devolvidas levam os eventos para quem publica depois do commit.
 */
@injectable()
export class OrderStockService {
  constructor(
    @inject(TYPES.PartCommandRunner)
    private readonly partCommandRunner: PartCommandRunner,
  ) {}

  reserve(order: ServiceOrder): Promise<Part[]> {
    return this.apply(order, (part, quantity) => part.reserve(quantity));
  }

  consume(order: ServiceOrder): Promise<Part[]> {
    return this.apply(order, (part, quantity) => part.consume(quantity));
  }

  private async apply(
    order: ServiceOrder,
    operation: (part: Part, quantity: number) => void,
  ): Promise<Part[]> {
    const items = order.stockItems;

    if (items.length === 0) {
      return [];
    }

    return this.partCommandRunner.apply(
      items.map((item) => item.partId as PartId),
      (parts) => applyOperationToParts(parts, items, operation),
    );
  }
}
