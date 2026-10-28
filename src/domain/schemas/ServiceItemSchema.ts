import { z } from 'zod';
import { serviceSchema } from './ServiceSchema.ts';

/** Servico incluido em uma OS, com nome, preco e tempo estimado copiados do catalogo. */
export const serviceItemSchema = z.object({
  id: z.uuid(),
  serviceId: z.uuid().describe('Servico do catalogo que originou o item'),
  name: serviceSchema.shape.name,
  price: serviceSchema.shape.price.describe('Preco congelado na inclusao'),
  estimatedMinutes: serviceSchema.shape.estimatedMinutes,
  startedAt: z.date().nullable().describe('Inicio da execucao'),
  finishedAt: z.date().nullable().describe('Conclusao da execucao'),
  createdAt: z.date(),
});

export type ServiceItemData = z.infer<typeof serviceItemSchema>;
