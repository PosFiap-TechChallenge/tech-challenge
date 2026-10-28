import type { PartItem } from '../../domain/entities/PartItem.ts';
import type { ServiceItem } from '../../domain/entities/ServiceItem.ts';
import type { ServiceOrder } from '../../domain/aggregates/ServiceOrder.ts';
import type { Vehicle } from '../../domain/aggregates/Vehicle.ts';
import type { StatusChange } from '../../domain/schemas/ServiceOrderSchema.ts';
import type { Budget } from '../../domain/value-objects/Budget.ts';
import type { ExecutionTimeStats } from '../../domain/repositories/ServiceOrderRepository.ts';
import type { ExecutionTimeOutput } from '../dto/outputs/ExecutionTimeOutput.ts';
import type {
  ServiceOrderOutput,
  ServiceOrderSummaryOutput,
} from '../dto/outputs/ServiceOrderOutput.ts';
import type { TrackingOutput } from '../dto/outputs/TrackingOutput.ts';

const MINUTE_DECIMALS = 100;

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function round(minutes: number): number {
  return Math.round(minutes * MINUTE_DECIMALS) / MINUTE_DECIMALS;
}

function toServiceItem(item: ServiceItem): ServiceOrderOutput['serviceItems'][number] {
  return {
    id: item.id,
    serviceId: item.serviceId,
    name: item.name,
    price: item.price.value,
    estimatedMinutes: item.estimatedMinutes,
    startedAt: iso(item.startedAt),
    finishedAt: iso(item.finishedAt),
  };
}

function toPartItem(item: PartItem): ServiceOrderOutput['partItems'][number] {
  return {
    id: item.id,
    partId: item.partId,
    code: item.code,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity.value,
    unitPrice: item.unitPrice.value,
    total: item.total.value,
  };
}

function toBudget(budget: Budget | null): ServiceOrderOutput['budget'] {
  if (!budget) {
    return null;
  }

  return {
    status: budget.status,
    total: budget.total.value,
    sentAt: budget.sentAt.toISOString(),
    decidedAt: iso(budget.decidedAt),
  };
}

function toStatusChange(change: StatusChange): ServiceOrderOutput['history'][number] {
  return { status: change.status, occurredAt: change.occurredAt.toISOString() };
}

export class ServiceOrderResponseMapper {
  static toResponse(order: ServiceOrder): ServiceOrderOutput {
    return {
      id: order.id,
      customerId: order.customerId,
      vehicleId: order.vehicleId,
      status: order.status,
      serviceItems: order.serviceItems.map(toServiceItem),
      partItems: order.partItems.map(toPartItem),
      total: order.budgetTotal.value,
      budget: toBudget(order.budget),
      history: order.history.map(toStatusChange),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  static toSummary(order: ServiceOrder): ServiceOrderSummaryOutput {
    return {
      id: order.id,
      customerId: order.customerId,
      vehicleId: order.vehicleId,
      status: order.status,
      total: order.budgetTotal.value,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  static toTracking(order: ServiceOrder, vehicle: Vehicle): TrackingOutput {
    return {
      id: order.id,
      status: order.status,
      vehicle: {
        plate: vehicle.plate.value,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
      },
      services: order.serviceItems.map((item) => ({
        name: item.name,
        price: item.price.value,
        estimatedMinutes: item.estimatedMinutes,
      })),
      parts: order.partItems.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity.value,
        total: item.total.value,
      })),
      total: order.budgetTotal.value,
      budget: toBudget(order.budget),
      timeline: order.history.map(toStatusChange),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  static toExecutionTime(stats: ExecutionTimeStats): ExecutionTimeOutput {
    return {
      finishedOrders: stats.finishedOrders,
      averageExecutionMinutes:
        stats.averageExecutionMinutes === null ? null : round(stats.averageExecutionMinutes),
      byService: stats.byService.map((service) => ({
        ...service,
        averageEstimatedMinutes: round(service.averageEstimatedMinutes),
        averageExecutionMinutes: round(service.averageExecutionMinutes),
      })),
    };
  }
}
