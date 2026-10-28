/** Ciclo de vida da Ordem de Servico, na ordem do fluxo. */
export const ORDER_STATUSES = [
  'RECEIVED',
  'IN_DIAGNOSIS',
  'AWAITING_APPROVAL',
  'IN_EXECUTION',
  'FINISHED',
  'DELIVERED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const OrderStatus = {
  RECEIVED: 'RECEIVED',
  IN_DIAGNOSIS: 'IN_DIAGNOSIS',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  IN_EXECUTION: 'IN_EXECUTION',
  FINISHED: 'FINISHED',
  DELIVERED: 'DELIVERED',
} as const satisfies Record<OrderStatus, OrderStatus>;

/** Rejeitar o orcamento devolve a OS ao diagnostico para revisar servicos e pecas. */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  RECEIVED: ['IN_DIAGNOSIS'],
  IN_DIAGNOSIS: ['AWAITING_APPROVAL'],
  AWAITING_APPROVAL: ['IN_EXECUTION', 'IN_DIAGNOSIS'],
  IN_EXECUTION: ['FINISHED'],
  FINISHED: ['DELIVERED'],
  DELIVERED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Servicos e pecas so mudam enquanto nao ha orcamento enviado ao cliente. */
export function isEditable(status: OrderStatus): boolean {
  return status === OrderStatus.RECEIVED || status === OrderStatus.IN_DIAGNOSIS;
}
