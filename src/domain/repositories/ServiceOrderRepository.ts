import type { ServiceOrder, ServiceOrderId } from '../aggregates/ServiceOrder.ts';
import type { OrderStatus } from '../value-objects/OrderStatus.ts';

export type ServiceOrderListQuery = {
  page: number;
  pageSize: number;
  status?: OrderStatus | undefined;
  customerId?: string | undefined;
};

export type ServiceOrderPage = {
  items: ServiceOrder[];
  total: number;
};

export type ServiceExecutionTime = {
  serviceId: string;
  name: string;
  finishedCount: number;
  averageEstimatedMinutes: number;
  averageExecutionMinutes: number;
};

/** Tempo medio de execucao dos servicos ja concluidos (inicio ate conclusao do item de servico). */
export type ExecutionTimeStats = {
  finishedOrders: number;
  averageExecutionMinutes: number | null;
  byService: ServiceExecutionTime[];
};

/**
 * `create` e `update` persistem a OS com seus itens e historico atomicamente.
 * `update` falha com `ConcurrentUpdateError` se a OS mudou desde a leitura (`version`).
 * Todos participam da transacao aberta por `UnitOfWork.run`, quando houver.
 */
export interface ServiceOrderRepository {
  findById(id: ServiceOrderId): Promise<ServiceOrder | null>;
  list(query: ServiceOrderListQuery): Promise<ServiceOrderPage>;
  create(order: ServiceOrder): Promise<void>;
  update(order: ServiceOrder): Promise<void>;
  executionTimeStats(): Promise<ExecutionTimeStats>;
}
