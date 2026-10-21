import { Part, type PartId } from '../../aggregates/Part.ts';
import type {
  PageQuery,
  PartListQuery,
  PartPage,
  PartRepository,
  StockMovementPage,
} from '../../repositories/PartRepository.ts';
import type { StockMovement } from '../../value-objects/StockMovement.ts';

function snapshot(part: Part, version = part.version): Part {
  return Part.from({
    id: part.id,
    code: part.code,
    name: part.name,
    type: part.type,
    unit: part.unit,
    unitPrice: part.unitPrice,
    quantity: part.quantity,
    reserved: part.reserved,
    minimumStock: part.minimumStock,
    version,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,
  });
}

/** Fake para testes HTTP: guarda copias e incrementa `version` como o repositorio Prisma. */
export class InMemoryPartRepository implements PartRepository {
  private readonly parts = new Map<string, Part>();
  private readonly movements: StockMovement[] = [];

  async findById(id: PartId): Promise<Part | null> {
    const part = this.parts.get(id);

    return part ? snapshot(part) : null;
  }

  async findByCode(code: string): Promise<Part | null> {
    const part = [...this.parts.values()].find((candidate) => candidate.code === code);

    return part ? snapshot(part) : null;
  }

  async list({ page, pageSize, belowMinimum }: PartListQuery): Promise<PartPage> {
    const ordered = [...this.parts.values()]
      .filter((part) => !belowMinimum || part.isBelowMinimum)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * pageSize;

    return {
      items: ordered.slice(start, start + pageSize).map((part) => snapshot(part)),
      total: ordered.length,
    };
  }

  async listMovements(id: PartId, { page, pageSize }: PageQuery): Promise<StockMovementPage> {
    const ordered = this.movements.filter((movement) => movement.partId === id).reverse();
    const start = (page - 1) * pageSize;

    return { items: ordered.slice(start, start + pageSize), total: ordered.length };
  }

  async create(part: Part): Promise<void> {
    this.parts.set(part.id, snapshot(part));
    this.movements.push(...part.pendingMovements);
  }

  async update(part: Part): Promise<void> {
    await this.updateAll([part]);
  }

  async updateAll(parts: readonly Part[]): Promise<void> {
    for (const part of parts) {
      this.parts.set(part.id, snapshot(part, part.version + 1));
      this.movements.push(...part.pendingMovements);
    }
  }

  async hasStockHistory(id: PartId): Promise<boolean> {
    return this.movements.some((movement) => movement.partId === id && movement.type !== 'INITIAL');
  }

  async delete(id: PartId): Promise<void> {
    this.parts.delete(id);
    this.movements.splice(
      0,
      this.movements.length,
      ...this.movements.filter((movement) => movement.partId !== id),
    );
  }

  clear(): void {
    this.parts.clear();
    this.movements.length = 0;
  }
}
