export const BUDGET_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export type BudgetStatus = (typeof BUDGET_STATUSES)[number];
