import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { TYPES } from '../../../application/dto/Types.ts';
import {
  ConcurrentUpdateError,
  ConflictError,
  PartHasStockHistoryError,
} from '../../../application/exceptions/AppError.ts';
import type { ReservePartsUseCase } from '../../../application/use-cases/parts/ReservePartsUseCase.ts';
import { type NewPartData, Part, type PartId } from '../../../domain/aggregates/Part.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import { container } from '../../di/Container.ts';

const prisma = container.get<PrismaClient>(TYPES.PrismaClient);
const repository = container.get<PartRepository>(TYPES.PartRepository);

const oil: NewPartData = {
  code: 'OLEO-5W30',
  name: 'Oleo 5W30',
  type: 'SUPPLY',
  unit: 'L',
  unitPrice: 45.9,
  initialQuantity: 20.5,
  minimumStock: 4,
};

const filter: NewPartData = {
  code: 'FILTRO-01',
  name: 'Filtro de oleo',
  type: 'PART',
  unit: 'UN',
  unitPrice: 25.9,
  initialQuantity: 10,
  minimumStock: 2,
};

async function persisted(data: NewPartData): Promise<Part> {
  const part = Part.create(data);
  await repository.create(part);

  return (await repository.findById(part.id)) as Part;
}

async function reload(part: Part): Promise<Part> {
  return (await repository.findById(part.id as PartId)) as Part;
}

async function movementTypes(part: Part): Promise<string[]> {
  const rows = await prisma.stockMovement.findMany({
    where: { partId: part.id },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((row) => row.type);
}

describe('PrismaPartRepository (PostgreSQL)', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE stock_movements, parts');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('create e leitura', () => {
    it('persiste a peca com o estoque inicial e preserva decimais exatos', async () => {
      const part = await persisted(oil);

      expect(part).toMatchObject({
        code: 'OLEO-5W30',
        type: 'SUPPLY',
        unit: 'L',
        unitPrice: 45.9,
        quantity: 20.5,
        reserved: 0,
        minimumStock: 4,
        version: 0,
      });
      expect(await movementTypes(part)).toEqual(['INITIAL']);
    });

    it('rejeita codigo repetido com ConflictError (indice unico)', async () => {
      await persisted(oil);

      await expect(repository.create(Part.create(oil))).rejects.toBeInstanceOf(ConflictError);
    });

    it('filtra pecas abaixo do minimo comparando duas colunas no banco', async () => {
      await persisted(oil);
      const low = await persisted({ ...filter, initialQuantity: 2 });

      const { items, total } = await repository.list({ page: 1, pageSize: 10, belowMinimum: true });

      expect(total).toBe(1);
      expect(items[0]?.id).toBe(low.id);
      expect((await repository.list({ page: 1, pageSize: 10 })).total).toBe(2);
    });
  });

  describe('update e updateAll', () => {
    it('grava saldo, movimentacoes e incrementa a versao', async () => {
      const part = await persisted(oil);

      part.registerEntry(0.1);
      part.registerEntry(0.2);
      await repository.update(part);

      const saved = await reload(part);
      const movements = await repository.listMovements(part.id, { page: 1, pageSize: 10 });

      expect(saved.quantity).toBe(20.8);
      expect(saved.version).toBe(1);
      expect(movements.items.map((movement) => [movement.type, movement.balanceAfter])).toEqual([
        ['ENTRY', 20.8],
        ['ENTRY', 20.6],
        ['INITIAL', 20.5],
      ]);
    });

    it('rejeita escrita sobre versao desatualizada', async () => {
      const part = await persisted(oil);
      const stale = await reload(part);

      part.reserve(1);
      await repository.update(part);
      stale.reserve(1);

      await expect(repository.update(stale)).rejects.toBeInstanceOf(ConcurrentUpdateError);
      expect((await reload(part)).reserved).toBe(1);
    });

    it('tudo ou nada: se uma peca do lote estiver desatualizada, nenhuma e gravada', async () => {
      const oilPart = await persisted(oil);
      const filterPart = await persisted(filter);
      const staleFilter = await reload(filterPart);

      filterPart.registerEntry(1);
      await repository.update(filterPart);

      oilPart.reserve(4.5);
      staleFilter.reserve(2);

      await expect(repository.updateAll([oilPart, staleFilter])).rejects.toBeInstanceOf(
        ConcurrentUpdateError,
      );
      expect((await reload(oilPart)).reserved).toBe(0);
      expect(await movementTypes(oilPart)).toEqual(['INITIAL']);
    });
  });

  describe('invariantes garantidas pelo banco', () => {
    it('CHECK impede reservado maior que o saldo, mesmo fora da aplicacao', async () => {
      const part = await persisted(filter);

      await expect(
        prisma.$executeRawUnsafe(`UPDATE parts SET reserved = 11 WHERE id = '${part.id}'`),
      ).rejects.toThrow(/parts_reserved_check/);
    });

    it('CHECK impede saldo negativo', async () => {
      const part = await persisted(filter);

      await expect(
        prisma.$executeRawUnsafe(`UPDATE parts SET quantity = -1 WHERE id = '${part.id}'`),
      ).rejects.toThrow(/parts_quantity_check|parts_reserved_check/);
    });
  });

  describe('delete', () => {
    it('remove peca que so tem o estoque inicial', async () => {
      const part = await persisted(filter);

      expect(await repository.hasStockHistory(part.id)).toBe(false);
      await repository.delete(part.id);

      expect(await repository.findById(part.id)).toBeNull();
      expect(await prisma.stockMovement.count({ where: { partId: part.id } })).toBe(0);
    });

    it('a FK bloqueia a remocao se surgir movimentacao, mesmo pulando a checagem', async () => {
      const part = await persisted(filter);
      part.registerEntry(1);
      await repository.update(part);

      expect(await repository.hasStockHistory(part.id)).toBe(true);
      await expect(repository.delete(part.id)).rejects.toBeInstanceOf(PartHasStockHistoryError);
      expect(await repository.findById(part.id)).not.toBeNull();
      expect(await movementTypes(part)).toEqual(['INITIAL', 'ENTRY']);
    });
  });

  describe('concorrencia real', () => {
    it('reservas simultaneas nunca ultrapassam o saldo disponivel', async () => {
      const reserve = container.get<ReservePartsUseCase>(TYPES.ReservePartsUseCase);
      const part = await persisted({ ...filter, initialQuantity: 12 });

      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () =>
          reserve.execute({ items: [{ partId: part.id, quantity: 2 }] }),
        ),
      );

      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      const saved = await reload(part);
      const reservations = await prisma.stockMovement.count({
        where: { partId: part.id, type: 'RESERVATION' },
      });

      expect(succeeded).toBeGreaterThan(0);
      expect(saved.reserved).toBe(succeeded * 2);
      expect(saved.reserved).toBeLessThanOrEqual(12);
      expect(reservations).toBe(succeeded);
    });
  });
});
