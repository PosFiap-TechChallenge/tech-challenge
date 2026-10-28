import type { Request } from 'express';
import {
  serviceOrderIdParamsSchema,
  serviceOrderItemParamsSchema,
} from '../../../application/dto/inputs/ServiceOrderParams.ts';
import type { ServiceOrderId } from '../../../domain/aggregates/ServiceOrder.ts';

export function parseOrderId(req: Request): ServiceOrderId {
  return serviceOrderIdParamsSchema.parse(req.params).id as ServiceOrderId;
}

export function parseOrderItem(req: Request): { id: ServiceOrderId; itemId: string } {
  const { id, itemId } = serviceOrderItemParamsSchema.parse(req.params);

  return { id: id as ServiceOrderId, itemId };
}
