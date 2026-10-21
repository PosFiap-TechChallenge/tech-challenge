import {
  Prisma,
  type Part as PartRecord,
  type StockMovement as StockMovementRecord,
} from '@prisma/client';
import { Part } from '../../../domain/aggregates/Part.ts';
import type { StockMovement } from '../../../domain/value-objects/StockMovement.ts';

/**
 * Colunas NUMERIC chegam como `Prisma.Decimal`. O dominio recebe `number` e o
 * revalida com `Quantity`/`Money`, que o convertem para inteiros exatos; na volta,
 * os decimais (no maximo 3 casas) sao representados sem perda pelo `Decimal`.
 */
export class PartPersistenceMapper {
  static toDomain(record: PartRecord): Part {
    return Part.from({
      id: record.id,
      code: record.code,
      name: record.name,
      type: record.type,
      unit: record.unit,
      unitPrice: record.unitPrice.toNumber(),
      quantity: record.quantity.toNumber(),
      reserved: record.reserved.toNumber(),
      minimumStock: record.minimumStock.toNumber(),
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(part: Part): PartRecord {
    return {
      id: part.id,
      code: part.code,
      name: part.name,
      type: part.type,
      unit: part.unit,
      unitPrice: new Prisma.Decimal(part.unitPrice),
      quantity: new Prisma.Decimal(part.quantity),
      reserved: new Prisma.Decimal(part.reserved),
      minimumStock: new Prisma.Decimal(part.minimumStock),
      version: part.version,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,
    };
  }

  /** `sequence` so serve para ordenar no banco e nao faz parte do dominio. */
  static movementToDomain({ sequence: _sequence, ...record }: StockMovementRecord): StockMovement {
    return {
      ...record,
      quantity: record.quantity.toNumber(),
      balanceAfter: record.balanceAfter.toNumber(),
      reservedAfter: record.reservedAfter.toNumber(),
    };
  }

  static movementToPersistence(movement: StockMovement): Prisma.StockMovementCreateManyInput {
    return {
      ...movement,
      quantity: new Prisma.Decimal(movement.quantity),
      balanceAfter: new Prisma.Decimal(movement.balanceAfter),
      reservedAfter: new Prisma.Decimal(movement.reservedAfter),
    };
  }
}
