import type { Part } from '../../domain/aggregates/Part.ts';
import type { StockMovement } from '../../domain/value-objects/StockMovement.ts';
import type { PartOutput, StockMovementOutput } from '../dto/outputs/PartOutput.ts';

export class PartResponseMapper {
  static toResponse(part: Part): PartOutput {
    return {
      id: part.id,
      code: part.code,
      name: part.name,
      type: part.type,
      unit: part.unit,
      unitPrice: part.unitPrice,
      quantity: part.quantity,
      reserved: part.reserved,
      available: part.available,
      minimumStock: part.minimumStock,
      belowMinimum: part.isBelowMinimum,
      createdAt: part.createdAt.toISOString(),
      updatedAt: part.updatedAt.toISOString(),
    };
  }

  static toMovementResponse(movement: StockMovement): StockMovementOutput {
    return {
      ...movement,
      createdAt: movement.createdAt.toISOString(),
    };
  }
}
