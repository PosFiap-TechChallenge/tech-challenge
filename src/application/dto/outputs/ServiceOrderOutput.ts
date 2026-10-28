import { BUDGET_STATUSES } from '../../../domain/value-objects/BudgetStatus.ts';
import { partItemSchema } from '../../../domain/schemas/PartItemSchema.ts';
import { serviceItemSchema } from '../../../domain/schemas/ServiceItemSchema.ts';
import { serviceOrderSchema } from '../../../domain/schemas/ServiceOrderSchema.ts';
import { z } from '../Zod.ts';
import { timestampsOutputShape } from './TimestampsOutput.ts';

const isoDate = z.iso.datetime();

export const serviceItemOutputSchema = serviceItemSchema
  .omit({ createdAt: true, startedAt: true, finishedAt: true })
  .extend({
    startedAt: isoDate.nullable().openapi({ description: 'Inicio da execucao' }),
    finishedAt: isoDate.nullable().openapi({ description: 'Conclusao da execucao' }),
  })
  .openapi('OrderServiceItemOutput');

export const partItemOutputSchema = partItemSchema
  .omit({ createdAt: true })
  .extend({ total: z.number().openapi({ description: 'Preco unitario x quantidade' }) })
  .openapi('OrderPartItemOutput');

export const budgetOutputSchema = z
  .object({
    status: z.enum(BUDGET_STATUSES),
    total: z.number(),
    sentAt: isoDate,
    decidedAt: isoDate.nullable(),
  })
  .openapi('BudgetOutput');

export const statusChangeOutputSchema = z
  .object({ status: serviceOrderSchema.shape.status, occurredAt: isoDate })
  .openapi('OrderStatusChangeOutput');

export const serviceOrderOutputSchema = z
  .object({
    id: serviceOrderSchema.shape.id,
    customerId: serviceOrderSchema.shape.customerId,
    vehicleId: serviceOrderSchema.shape.vehicleId,
    status: serviceOrderSchema.shape.status,
    serviceItems: z.array(serviceItemOutputSchema),
    partItems: z.array(partItemOutputSchema),
    total: z.number().openapi({
      description: 'Orcamento calculado automaticamente: servicos mais pecas, sempre atual',
    }),
    budget: budgetOutputSchema
      .nullable()
      .openapi({ description: 'Orcamento enviado ao cliente, com o total congelado no envio' }),
    history: z.array(statusChangeOutputSchema),
    ...timestampsOutputShape,
  })
  .openapi('ServiceOrderOutput');

export type ServiceOrderOutput = z.infer<typeof serviceOrderOutputSchema>;

export const serviceOrderSummaryOutputSchema = serviceOrderOutputSchema
  .pick({
    id: true,
    customerId: true,
    vehicleId: true,
    status: true,
    total: true,
    createdAt: true,
    updatedAt: true,
  })
  .openapi('ServiceOrderSummaryOutput');

export type ServiceOrderSummaryOutput = z.infer<typeof serviceOrderSummaryOutputSchema>;

export const serviceOrderPageOutputSchema = z
  .object({
    items: z.array(serviceOrderSummaryOutputSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi('ServiceOrderPageOutput');

export type ServiceOrderPageOutput = z.infer<typeof serviceOrderPageOutputSchema>;
