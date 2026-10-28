import { vehicleSchema } from '../../../domain/schemas/VehicleSchema.ts';
import { z } from '../Zod.ts';
import {
  budgetOutputSchema,
  serviceOrderOutputSchema,
  statusChangeOutputSchema,
} from './ServiceOrderOutput.ts';

/** O que o cliente ve da propria OS: andamento, itens e orcamento, sem dados internos. */
export const trackingOutputSchema = z
  .object({
    id: serviceOrderOutputSchema.shape.id,
    status: serviceOrderOutputSchema.shape.status,
    vehicle: vehicleSchema.pick({ plate: true, brand: true, model: true, year: true }),
    services: z.array(
      z.object({ name: z.string(), price: z.number(), estimatedMinutes: z.number().int() }),
    ),
    parts: z.array(
      z.object({
        name: z.string(),
        unit: z.string(),
        quantity: z.number(),
        total: z.number(),
      }),
    ),
    total: serviceOrderOutputSchema.shape.total,
    budget: budgetOutputSchema.nullable(),
    timeline: z.array(statusChangeOutputSchema),
    updatedAt: serviceOrderOutputSchema.shape.updatedAt,
  })
  .openapi('TrackingOutput');

export type TrackingOutput = z.infer<typeof trackingOutputSchema>;
