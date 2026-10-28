import { vehicleSchema } from '../../../domain/schemas/VehicleSchema.ts';
import { taxDocumentSchema } from '../../../domain/schemas/TaxDocumentSchema.ts';
import { z } from '../Zod.ts';

export const createServiceOrderInputSchema = z
  .object({
    customerDocument: taxDocumentSchema().describe('CPF ou CNPJ do cliente, com ou sem mascara'),
    vehicle: z.object({
      plate: vehicleSchema.shape.plate,
      brand: vehicleSchema.shape.brand
        .optional()
        .describe('Obrigatoria se o veiculo ainda nao estiver cadastrado'),
      model: vehicleSchema.shape.model
        .optional()
        .describe('Obrigatorio se o veiculo ainda nao estiver cadastrado'),
      year: vehicleSchema.shape.year
        .optional()
        .describe('Obrigatorio se o veiculo ainda nao estiver cadastrado'),
    }),
  })
  .openapi('CreateServiceOrderInput', {
    description:
      'Identifica o cliente por CPF/CNPJ. Veiculo ja cadastrado e identificado pela placa; ' +
      'veiculo novo e cadastrado junto, com marca, modelo e ano',
    example: {
      customerDocument: '529.982.247-25',
      vehicle: { plate: 'ABC1D23', brand: 'Fiat', model: 'Argo', year: 2022 },
    },
  });

export type CreateServiceOrderInput = z.infer<typeof createServiceOrderInputSchema>;
