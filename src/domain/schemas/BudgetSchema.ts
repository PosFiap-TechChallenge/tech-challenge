import { z } from 'zod';
import { BUDGET_STATUSES } from '../value-objects/BudgetStatus.ts';
import { moneySchema } from './MoneySchema.ts';

/** Orcamento enviado ao cliente: o total fica congelado no envio. */
export const budgetSchema = z
  .object({
    status: z.enum(BUDGET_STATUSES),
    total: moneySchema().describe('Total em reais, calculado dos servicos e pecas no envio'),
    sentAt: z.date(),
    decidedAt: z.date().nullable().describe('Momento da aprovacao ou rejeicao'),
  })
  .refine((budget) => (budget.status === 'PENDING') === (budget.decidedAt === null), {
    message: 'Somente orcamento pendente fica sem data de decisao',
    path: ['decidedAt'],
  });

export type BudgetData = z.infer<typeof budgetSchema>;
