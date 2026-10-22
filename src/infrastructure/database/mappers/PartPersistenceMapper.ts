import {
  Prisma,
  type Part as PartRecord,
  type StockMovement as StockMovementRecord,
} from '@prisma/client';
import { Part } from '../../../domain/aggregates/Part.ts';
import type { StockMovement } from '../../../domain/value-objects/StockMovement.ts';

/**
 * Colunas NUMERIC chegam como `Prisma.Decimal`. O dominio recebe `number` e o
 * revalida com o schema da peca e `Quantity`/`Money`, que o convertem para inteiros exatos; na volta,
 * os decimais (no maximo 3 casas) sao representados sem perda pelo `Decimal`.
 */
export class PartPersistenceMapper {
  static toDomain(record: PartRecord): Part {
    return Part.from({
      ...record,
      unitPrice: record.unitPrice.toNumber(),
      quantity: record.quantity.toNumber(),
      reserved: record.reserved.toNumber(),
      minimumStock: record.minimumStock.toNumber(),
    });
  }

  static toPersistence(part: Part): PartRecord {
    const data = part.toData();

    return {
      ...data,
      unitPrice: new Prisma.Decimal(data.unitPrice),
      quantity: new Prisma.Decimal(data.quantity),
      reserved: new Prisma.Decimal(data.reserved),
      minimumStock: new Prisma.Decimal(data.minimumStock),
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
