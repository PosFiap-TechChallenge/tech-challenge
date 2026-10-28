import { describe, expect, it } from 'vitest';
import { canTransition, isEditable, ORDER_STATUSES, type OrderStatus } from './OrderStatus.ts';

const ALLOWED: ReadonlyArray<[OrderStatus, OrderStatus]> = [
  ['RECEIVED', 'IN_DIAGNOSIS'],
  ['IN_DIAGNOSIS', 'AWAITING_APPROVAL'],
  ['AWAITING_APPROVAL', 'IN_EXECUTION'],
  ['AWAITING_APPROVAL', 'IN_DIAGNOSIS'],
  ['IN_EXECUTION', 'FINISHED'],
  ['FINISHED', 'DELIVERED'],
];

describe('OrderStatus', () => {
  it('lista os seis status da Fase 1, na ordem do fluxo', () => {
    expect(ORDER_STATUSES).toEqual([
      'RECEIVED',
      'IN_DIAGNOSIS',
      'AWAITING_APPROVAL',
      'IN_EXECUTION',
      'FINISHED',
      'DELIVERED',
    ]);
  });

  it.each(ALLOWED)('permite %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it('bloqueia toda transicao fora da tabela, inclusive para o mesmo status', () => {
    const forbidden = ORDER_STATUSES.flatMap((from) =>
      ORDER_STATUSES.filter(
        (to) =>
          !ALLOWED.some(([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to),
      ).map((to): [OrderStatus, OrderStatus] => [from, to]),
    );

    expect(forbidden.length).toBe(30);
    expect(forbidden.filter(([from, to]) => canTransition(from, to))).toEqual([]);
  });

  it('DELIVERED e final', () => {
    expect(ORDER_STATUSES.filter((to) => canTransition('DELIVERED', to))).toEqual([]);
  });

  it('so permite editar itens antes do orcamento ser enviado', () => {
    expect(ORDER_STATUSES.filter(isEditable)).toEqual(['RECEIVED', 'IN_DIAGNOSIS']);
  });
});
