import { Prisma, type ServiceOrder as ServiceOrderRecord } from '@prisma/client';
import { ServiceOrder } from '../../../domain/aggregates/ServiceOrder.ts';
import type { BudgetData } from '../../../domain/schemas/BudgetSchema.ts';

export const SERVICE_ORDER_INCLUDE = {
  serviceItems: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
  partItems: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
  statusChanges: { orderBy: { id: 'asc' } },
} satisfies Prisma.ServiceOrderInclude;

export type ServiceOrderWithChildren = Prisma.ServiceOrderGetPayload<{
  include: typeof SERVICE_ORDER_INCLUDE;
}>;

export type OrderChildren = {
  serviceItems: Prisma.OrderServiceItemCreateManyInput[];
  partItems: Prisma.OrderPartItemCreateManyInput[];
  statusChanges: Prisma.OrderStatusChangeCreateManyInput[];
};

function toBudgetData(record: ServiceOrderRecord): BudgetData | null {
  const { budgetStatus, budgetTotal, budgetSentAt, budgetDecidedAt } = record;

  if (budgetStatus === null || budgetTotal === null || budgetSentAt === null) {
    return null;
  }

  return {
    status: budgetStatus,
    total: budgetTotal.toNumber(),
    sentAt: budgetSentAt,
    decidedAt: budgetDecidedAt,
  };
}

/**
 * Colunas NUMERIC chegam como `Prisma.Decimal`; o dominio recebe `number` e revalida com
 * os schemas e `Money`/`Quantity`. Os filhos (itens e historico) sao regravados junto com a OS.
 */
export class ServiceOrderPersistenceMapper {
  static toDomain(record: ServiceOrderWithChildren): ServiceOrder {
    const { serviceItems, partItems, statusChanges, ...order } = record;

    return ServiceOrder.from({
      id: order.id,
      customerId: order.customerId,
      vehicleId: order.vehicleId,
      status: order.status,
      serviceItems: serviceItems.map(({ orderId: _orderId, ...item }) => ({
        ...item,
        price: item.price.toNumber(),
      })),
      partItems: partItems.map(({ orderId: _orderId, ...item }) => ({
        ...item,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
      })),
      budget: toBudgetData(order),
      history: statusChanges.map(({ status, occurredAt }) => ({ status, occurredAt })),
      version: order.version,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  }

  /** Colunas da propria OS, sem `version`: o repositorio a controla. */
  static toRecord(order: ServiceOrder): Prisma.ServiceOrderUncheckedCreateInput {
    const budget = order.budget?.toData() ?? null;

    return {
      id: order.id,
      customerId: order.customerId,
      vehicleId: order.vehicleId,
      status: order.status,
      budgetStatus: budget?.status ?? null,
      budgetTotal: budget ? new Prisma.Decimal(budget.total) : null,
      budgetSentAt: budget?.sentAt ?? null,
      budgetDecidedAt: budget?.decidedAt ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  static toChildren(order: ServiceOrder): OrderChildren {
    const orderId = order.id;
    const data = order.toData();

    return {
      serviceItems: data.serviceItems.map((item) => ({
        ...item,
        orderId,
        price: new Prisma.Decimal(item.price),
      })),
      partItems: data.partItems.map((item) => ({
        ...item,
        orderId,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
      })),
      statusChanges: data.history.map((change) => ({ ...change, orderId })),
    };
  }
}
