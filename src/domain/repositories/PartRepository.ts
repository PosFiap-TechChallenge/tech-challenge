import type { Part, PartId } from '../aggregates/Part.ts';
import type { StockMovement } from '../value-objects/StockMovement.ts';

export type PageQuery = {
  page: number;
  pageSize: number;
};

export type PartListQuery = PageQuery & {
  /** Somente pecas com saldo fisico menor ou igual ao estoque minimo. */
  belowMinimum?: boolean | undefined;
};

export type PartPage = {
  items: Part[];
  total: number;
};

export type StockMovementPage = {
  items: StockMovement[];
  total: number;
};

/**
 * `create` e `update` persistem a peca e suas `pendingMovements` atomicamente.
 * `update`/`updateAll` falham com `ConcurrentUpdateError` se alguma peca mudou desde a
 * leitura (`version`); `updateAll` grava todas as pecas numa unica transacao.
 * `delete` remove a peca e seu registro de estoque inicial; falha se houver outras movimentacoes.
 */
export interface PartRepository {
  findById(id: PartId): Promise<Part | null>;
  findByCode(code: string): Promise<Part | null>;
  list(query: PartListQuery): Promise<PartPage>;
  listMovements(id: PartId, query: PageQuery): Promise<StockMovementPage>;
  create(part: Part): Promise<void>;
  update(part: Part): Promise<void>;
  updateAll(parts: readonly Part[]): Promise<void>;
  /** Ha movimentacoes alem do estoque inicial (entrada, ajuste, reserva...)? */
  hasStockHistory(id: PartId): Promise<boolean>;
  delete(id: PartId): Promise<void>;
}
