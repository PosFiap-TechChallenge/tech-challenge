import { Part, type PartPrimitives } from '../../aggregates/Part.ts';

export const PART_ID = '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';

export function makePart(overrides: Partial<PartPrimitives> = {}): Part {
  return Part.from({
    id: PART_ID,
    code: 'FLT-OLEO-01',
    name: 'Filtro de oleo',
    type: 'PART',
    unit: 'UN',
    unitPrice: 25.9,
    quantity: 10,
    reserved: 0,
    minimumStock: 3,
    version: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}
