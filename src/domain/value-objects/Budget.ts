import { DomainError } from '../errors/DomainError.ts';
import { budgetSchema, type BudgetData } from '../schemas/BudgetSchema.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import type { BudgetStatus } from './BudgetStatus.ts';
import { Money } from './Money.ts';

const ERROR_CODES = {
  status: 'INVALID_BUDGET',
  total: 'INVALID_MONEY',
  decidedAt: 'INVALID_BUDGET',
};

/** Orcamento da OS: imutavel; aprovar ou rejeitar devolve um novo valor. */
export class Budget {
  private constructor(
    readonly status: BudgetStatus,
    readonly total: Money,
    readonly sentAt: Date,
    readonly decidedAt: Date | null,
  ) {}

  static send(total: Money, sentAt: Date): Budget {
    return new Budget('PENDING', total, sentAt, null);
  }

  static from(data: BudgetData): Budget {
    const budget = parseSchema(budgetSchema, data, ERROR_CODES, 'INVALID_BUDGET');

    return new Budget(budget.status, Money.of(budget.total), budget.sentAt, budget.decidedAt);
  }

  approve(decidedAt: Date): Budget {
    return this.decide('APPROVED', decidedAt);
  }

  reject(decidedAt: Date): Budget {
    return this.decide('REJECTED', decidedAt);
  }

  toData(): BudgetData {
    return {
      status: this.status,
      total: this.total.value,
      sentAt: this.sentAt,
      decidedAt: this.decidedAt,
    };
  }

  private decide(status: BudgetStatus, decidedAt: Date): Budget {
    if (this.status !== 'PENDING') {
      throw new DomainError('Orcamento ja foi decidido', 'BUDGET_ALREADY_DECIDED');
    }

    return new Budget(status, this.total, this.sentAt, decidedAt);
  }
}
