import { z } from 'zod';
import { ORDER_STATUSES } from '../value-objects/OrderStatus.ts';
import { budgetSchema } from './BudgetSchema.ts';
import { partItemSchema } from './PartItemSchema.ts';
import { serviceItemSchema } from './ServiceItemSchema.ts';

export const statusChangeSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  occurredAt: z.date(),
});

export type StatusChange = z.infer<typeof statusChangeSchema>;

/** Espelha as tabelas `service_orders` e filhas. O orcamento so existe depois de enviado. */
export const serviceOrderSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid().describe('Cliente dono da OS'),
  vehicleId: z.uuid().describe('Veiculo atendido; pertence ao cliente da OS'),
  status: z.enum(ORDER_STATUSES),
  serviceItems: z.array(serviceItemSchema),
  partItems: z.array(partItemSchema),
  budget: budgetSchema.nullable(),
  history: z.array(statusChangeSchema).min(1).describe('Cada status pelo qual a OS passou'),
  version: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ServiceOrderData = z.infer<typeof serviceOrderSchema>;
