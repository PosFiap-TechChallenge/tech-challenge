import { Prisma, type PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import {
  ConcurrentUpdateError,
  ConflictError,
  NotFoundError,
  PartHasStockHistoryError,
} from '../../../application/exceptions/AppError.ts';
import type { Part, PartId } from '../../../domain/aggregates/Part.ts';
import type {
  PageQuery,
  PartListQuery,
  PartPage,
  PartRepository,
  StockMovementPage,
} from '../../../domain/repositories/PartRepository.ts';
import { PartPersistenceMapper } from '../mappers/PartPersistenceMapper.ts';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';
const RECORD_NOT_FOUND = 'P2025';

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function translateWriteError(error: unknown): unknown {
  if (hasPrismaErrorCode(error, UNIQUE_CONSTRAINT_VIOLATION)) {
    return new ConflictError('Peca', 'codigo');
  }

  // Uma movimentacao registrada entre a checagem e o delete bloqueia a remocao.
  if (hasPrismaErrorCode(error, FOREIGN_KEY_VIOLATION)) {
    return new PartHasStockHistoryError();
  }

  if (hasPrismaErrorCode(error, RECORD_NOT_FOUND)) {
    return new NotFoundError('Peca');
  }

  return error;
}

function movementRecords(part: Part): Prisma.StockMovementCreateManyInput[] {
  return part.pendingMovements.map((movement) =>
    PartPersistenceMapper.movementToPersistence(movement),
  );
}

@injectable()
export class PrismaPartRepository implements PartRepository {
  constructor(
    @inject(TYPES.PrismaClient)
    private readonly prisma: PrismaClient,
  ) {}

  async findById(id: PartId): Promise<Part | null> {
    const record = await this.prisma.part.findUnique({ where: { id } });

    return record ? PartPersistenceMapper.toDomain(record) : null;
  }

  async findByCode(code: string): Promise<Part | null> {
    const record = await this.prisma.part.findUnique({ where: { code } });

    return record ? PartPersistenceMapper.toDomain(record) : null;
  }

  async list({ page, pageSize, belowMinimum }: PartListQuery): Promise<PartPage> {
    const where: Prisma.PartWhereInput = belowMinimum
      ? { quantity: { lte: this.prisma.part.fields.minimumStock } }
      : {};

    const [records, total] = await this.prisma.$transaction([
      this.prisma.part.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.part.count({ where }),
    ]);

    return { items: records.map((record) => PartPersistenceMapper.toDomain(record)), total };
  }

  async listMovements(id: PartId, { page, pageSize }: PageQuery): Promise<StockMovementPage> {
    const where: Prisma.StockMovementWhereInput = { partId: id };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { sequence: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      items: records.map((record) => PartPersistenceMapper.movementToDomain(record)),
      total,
    };
  }

  async create(part: Part): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.part.create({ data: PartPersistenceMapper.toPersistence(part) }),
        this.prisma.stockMovement.createMany({ data: movementRecords(part) }),
      ]);
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async update(part: Part): Promise<void> {
    await this.updateAll([part]);
  }

  /**
   * Lock otimista: cada peca so e gravada se a `version` no banco ainda e a que foi
   * lida; se qualquer uma falhar, a transacao inteira e desfeita. As pecas sao
   * gravadas em ordem de id para que lotes concorrentes travem as linhas na mesma
   * ordem e nao entrem em deadlock.
   */
  async updateAll(parts: readonly Part[]): Promise<void> {
    const ordered = [...parts].sort((a, b) => a.id.localeCompare(b.id));

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const part of ordered) {
          const {
            id,
            version,
            createdAt: _createdAt,
            ...data
          } = PartPersistenceMapper.toPersistence(part);

          const { count } = await tx.part.updateMany({
            where: { id, version },
            data: { ...data, version: { increment: 1 } },
          });

          if (count === 0) {
            const exists = await tx.part.count({ where: { id } });

            throw exists ? new ConcurrentUpdateError('Peca') : new NotFoundError('Peca');
          }
        }

        await tx.stockMovement.createMany({ data: ordered.flatMap(movementRecords) });
      });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async hasStockHistory(id: PartId): Promise<boolean> {
    const count = await this.prisma.stockMovement.count({
      where: { partId: id, type: { not: 'INITIAL' } },
    });

    return count > 0;
  }

  async delete(id: PartId): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.stockMovement.deleteMany({ where: { partId: id, type: 'INITIAL' } }),
        this.prisma.part.delete({ where: { id } }),
      ]);
    } catch (error) {
      throw translateWriteError(error);
    }
  }
}
