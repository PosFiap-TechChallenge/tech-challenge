import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { TYPES } from '../../../application/dto/Types.ts';
import { ConflictError, NotFoundError } from '../../../application/exceptions/AppError.ts';
import { Service } from '../../../domain/aggregates/Service.ts';
import type { ServiceRepository } from '../../../domain/repositories/ServiceRepository.ts';
import { container } from '../../di/Container.ts';

const prisma = container.get<PrismaClient>(TYPES.PrismaClient);
const repository = container.get<ServiceRepository>(TYPES.ServiceRepository);

async function persisted(name: string, price = 89.9): Promise<Service> {
  const service = Service.create({ name, price, estimatedMinutes: 60 });
  await repository.create(service);

  return service;
}

describe('PrismaServiceRepository (PostgreSQL)', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE services');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persiste o servico e preserva o preco decimal exato', async () => {
    const service = await persisted('Alinhamento', 89.9);

    const found = await repository.findById(service.id);

    expect(found?.toData()).toMatchObject({
      name: 'Alinhamento',
      price: 89.9,
      estimatedMinutes: 60,
    });
  });

  it('encontra o servico pelo nome e retorna null quando nao existe', async () => {
    await persisted('Alinhamento');

    expect(await repository.findByName('Alinhamento')).not.toBeNull();
    expect(await repository.findByName('Balanceamento')).toBeNull();
  });

  it('traduz a violacao de nome unico em ConflictError', async () => {
    await persisted('Alinhamento');

    await expect(persisted('Alinhamento')).rejects.toBeInstanceOf(ConflictError);
  });

  it('atualiza os campos do servico', async () => {
    const service = await persisted('Alinhamento');

    service.update({ price: 99.5, estimatedMinutes: 75 });
    await repository.update(service);

    const found = await repository.findById(service.id);

    expect(found?.toData()).toMatchObject({ price: 99.5, estimatedMinutes: 75 });
  });

  it('traduz a atualizacao de nome ja usado em ConflictError', async () => {
    await persisted('Alinhamento');
    const other = await persisted('Balanceamento');

    other.update({ name: 'Alinhamento' });

    await expect(repository.update(other)).rejects.toBeInstanceOf(ConflictError);
  });

  it('lista com paginacao e total', async () => {
    await persisted('A');
    await persisted('B');
    await persisted('C');

    const page = await repository.list({ page: 2, pageSize: 2 });

    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(1);
  });

  it('remove o servico e traduz a remocao de inexistente em NotFoundError', async () => {
    const service = await persisted('Alinhamento');

    await repository.delete(service.id);

    expect(await repository.findById(service.id)).toBeNull();
    await expect(repository.delete(service.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
