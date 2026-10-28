import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/DomainError.ts';
import { Budget } from './Budget.ts';
import { Money } from './Money.ts';

const SENT_AT = new Date('2026-01-01T10:00:00.000Z');
const DECIDED_AT = new Date('2026-01-01T11:00:00.000Z');

describe('Budget', () => {
  it('nasce pendente com o total congelado e sem decisao', () => {
    const budget = Budget.send(Money.of(250.5), SENT_AT);

    expect(budget.toData()).toEqual({
      status: 'PENDING',
      total: 250.5,
      sentAt: SENT_AT,
      decidedAt: null,
    });
  });

  it('aprova um orcamento pendente sem alterar o original', () => {
    const pending = Budget.send(Money.of(100), SENT_AT);

    const approved = pending.approve(DECIDED_AT);

    expect(approved.status).toBe('APPROVED');
    expect(approved.decidedAt).toEqual(DECIDED_AT);
    expect(approved.total.value).toBe(100);
    expect(pending.status).toBe('PENDING');
  });

  it('rejeita um orcamento pendente', () => {
    const rejected = Budget.send(Money.of(100), SENT_AT).reject(DECIDED_AT);

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.decidedAt).toEqual(DECIDED_AT);
  });

  it.each(['approve', 'reject'] as const)('nao permite decidir %s duas vezes', (decision) => {
    const decided = Budget.send(Money.of(100), SENT_AT).approve(DECIDED_AT);

    expect(() => decided[decision](DECIDED_AT)).toThrow(DomainError);
  });

  it('reconstroi a partir dos dados persistidos e rejeita dados incoerentes', () => {
    const data = { status: 'APPROVED', total: 10, sentAt: SENT_AT, decidedAt: DECIDED_AT } as const;

    expect(Budget.from(data).toData()).toEqual(data);
    expect(() => Budget.from({ ...data, decidedAt: null })).toThrow(DomainError);
    expect(() => Budget.from({ ...data, status: 'PENDING' })).toThrow(DomainError);
  });
});
