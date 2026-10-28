import { Prisma, type PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import {
  ConcurrentUpdateError,
  ConflictError,
  NotFoundError,
} from '../../../application/exceptions/AppError.ts';
import type { ServiceOrder, ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';
import type {
  ExecutionTimeStats,
  ServiceOrderListQuery,
  ServiceOrderPage,
  ServiceOrderRepository,
} from '../../../domain/repositories/ServiceOrderRepository.ts';
import {
  SERVICE_ORDER_INCLUDE,
  ServiceOrderPersistenceMapper,
} from '../mappers/ServiceOrderPersistenceMapper.ts';
import {
  currentClient,
  isInTransaction,
  runInTransaction,
  type DatabaseClient,
} from '../TransactionContext.ts';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

type OverallRow = { orders: number; average: number | null };

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function translateWriteError(error: unknown): unknown {
  if (hasPrismaErrorCode(error, UNIQUE_CONSTRAINT_VIOLATION)) {
    return new ConflictError('Ordem de Servico', 'id');
  }

  if (hasPrismaErrorCode(error, FOREIGN_KEY_VIOLATION)) {
    return new NotFoundError('Cliente, veiculo, servico ou peca da Ordem de Servico');
  }

  return error;
}

@injectable()
export class PrismaServiceOrderRepository implements ServiceOrderRepository {
  constructor(
    @inject(TYPES.PrismaClient)
    private readonly prisma: PrismaClient,
  ) {}

  private get client(): DatabaseClient {
    return currentClient(this.prisma);
  }

  /**
   * Dentro de uma unidade de trabalho a OS fica travada (`FOR UPDATE`) ate o fim da transacao:
   * comandos na mesma OS rodam um de cada vez. Sem o bloqueio, as consultas que montam o agregado
   * (OS, itens, historico) poderiam enxergar commits diferentes e devolver uma OS inconsistente.
   */
  async findById(id: ServiceOrderId): Promise<ServiceOrder | null> {
    await this.lockWhenInTransaction(id);

    const record = await this.client.serviceOrder.findUnique({
      where: { id },
      include: SERVICE_ORDER_INCLUDE,
    });

    return record ? ServiceOrderPersistenceMapper.toDomain(record) : null;
  }

  async list({
    page,
    pageSize,
    status,
    customerId,
  }: ServiceOrderListQuery): Promise<ServiceOrderPage> {
    const where: Prisma.ServiceOrderWhereInput = {
      ...(status === undefined ? {} : { status }),
      ...(customerId === undefined ? {} : { customerId }),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.serviceOrder.findMany({
        where,
        include: SERVICE_ORDER_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    return {
      items: records.map((record) => ServiceOrderPersistenceMapper.toDomain(record)),
      total,
    };
  }

  async create(order: ServiceOrder): Promise<void> {
    try {
      await runInTransaction(this.prisma, async (tx) => {
        await tx.serviceOrder.create({ data: ServiceOrderPersistenceMapper.toRecord(order) });

        await this.writeChildren(tx, order);
      });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  /**
   * Lock otimista: a OS so e gravada se a `version` no banco ainda e a que foi lida. Os itens
   * e o historico sao regravados na mesma transacao, entao nunca ficam fora de sincronia.
   */
  async update(order: ServiceOrder): Promise<void> {
    try {
      await runInTransaction(this.prisma, async (tx) => {
        await this.updateRecord(tx, order);

        await tx.orderServiceItem.deleteMany({ where: { orderId: order.id } });
        await tx.orderPartItem.deleteMany({ where: { orderId: order.id } });
        await tx.orderStatusChange.deleteMany({ where: { orderId: order.id } });

        await this.writeChildren(tx, order);
      });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async executionTimeStats(): Promise<ExecutionTimeStats> {
    const [overall] = await this.client.$queryRaw<OverallRow[]>`
      SELECT COUNT(*)::int AS orders, AVG(minutes)::float8 AS average
      FROM (
        SELECT EXTRACT(EPOCH FROM (MAX(finished_at) - MIN(started_at))) / 60 AS minutes
        FROM order_service_items
        WHERE finished_at IS NOT NULL
        GROUP BY order_id
      ) AS executions`;

    const byService = await this.client.$queryRaw<ExecutionTimeStats['byService']>`
      SELECT
        service.id AS "serviceId",
        service.name AS "name",
        COUNT(*)::int AS "finishedCount",
        AVG(item.estimated_minutes)::float8 AS "averageEstimatedMinutes",
        AVG(EXTRACT(EPOCH FROM (item.finished_at - item.started_at)) / 60)::float8
          AS "averageExecutionMinutes"
      FROM order_service_items AS item
      JOIN services AS service ON service.id = item.service_id
      WHERE item.finished_at IS NOT NULL
      GROUP BY service.id, service.name
      ORDER BY service.name`;

    return {
      finishedOrders: overall?.orders ?? 0,
      averageExecutionMinutes: overall?.average ?? null,
      byService,
    };
  }

  private async lockWhenInTransaction(id: ServiceOrderId): Promise<void> {
    if (!isInTransaction()) {
      return;
    }

    await this.client.$queryRaw`SELECT id FROM service_orders WHERE id = ${id}::uuid FOR UPDATE`;
  }

  private async updateRecord(tx: Prisma.TransactionClient, order: ServiceOrder): Promise<void> {
    const { id, createdAt: _createdAt, ...data } = ServiceOrderPersistenceMapper.toRecord(order);

    const { count } = await tx.serviceOrder.updateMany({
      where: { id, version: order.version },
      data: { ...data, version: { increment: 1 } },
    });

    if (count > 0) {
      return;
    }

    const exists = await tx.serviceOrder.count({ where: { id } });

    throw exists
      ? new ConcurrentUpdateError('Ordem de Servico')
      : new NotFoundError('Ordem de Servico');
  }

  private async writeChildren(tx: Prisma.TransactionClient, order: ServiceOrder): Promise<void> {
    const { serviceItems, partItems, statusChanges } =
      ServiceOrderPersistenceMapper.toChildren(order);

    await tx.orderServiceItem.createMany({ data: serviceItems });
    await tx.orderPartItem.createMany({ data: partItems });
    await tx.orderStatusChange.createMany({ data: statusChanges });
  }
}
