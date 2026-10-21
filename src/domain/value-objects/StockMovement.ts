export const STOCK_MOVEMENT_TYPES = [
  'INITIAL',
  'ENTRY',
  'ADJUSTMENT',
  'RESERVATION',
  'RELEASE',
  'CONSUMPTION',
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/**
 * Registro imutavel de uma operacao sobre o estoque de uma peca.
 *
 * `quantity` e a quantidade movimentada (sempre positiva), exceto em `ADJUSTMENT`,
 * onde e a diferenca aplicada ao saldo fisico (positiva ou negativa).
 * `balanceAfter` e `reservedAfter` guardam o estado da peca logo apos a operacao.
 * Valores na unidade de medida da peca, com ate 3 casas decimais.
 */
export type StockMovement = {
  id: string;
  partId: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  reservedAfter: number;
  reason: string | null;
  createdAt: Date;
};
