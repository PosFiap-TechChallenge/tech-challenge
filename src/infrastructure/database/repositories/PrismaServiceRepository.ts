import { Prisma, type PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import {
  AppError,
  ConflictError,
  NotFoundError,
} from '../../../application/exceptions/AppError.ts';
import type { Service, ServiceId } from '../../../domain/aggregates/Service.ts';
import type {
  ServiceListQuery,
  ServicePage,
  ServiceRepository,
} from '../../../domain/repositories/ServiceRepository.ts';
import { ServicePersistenceMapper } from '../mappers/ServicePersistenceMapper.ts';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';
const RECORD_NOT_FOUND = 'P2025';

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function translateWriteError(error: unknown): unknown {
  if (hasPrismaErrorCode(error, UNIQUE_CONSTRAINT_VIOLATION)) {
    return new ConflictError('Servico', 'nome');
  }

  if (hasPrismaErrorCode(error, FOREIGN_KEY_VIOLATION)) {
    return new AppError(
      'Servico esta em Ordens de Servico e nao pode ser removido',
      'SERVICE_IN_USE',
      409,
    );
  }

  if (hasPrismaErrorCode(error, RECORD_NOT_FOUND)) {
    return new NotFoundError('Servico');
  }

  return error;
}

@injectable()
export class PrismaServiceRepository implements ServiceRepository {
  constructor(
    @inject(TYPES.PrismaClient)
    private readonly prisma: PrismaClient,
  ) {}

  async findById(id: ServiceId): Promise<Service | null> {
    const record = await this.prisma.service.findUnique({ where: { id } });

    return record ? ServicePersistenceMapper.toDomain(record) : null;
  }

  async findByName(name: string): Promise<Service | null> {
    const record = await this.prisma.service.findUnique({ where: { name } });

    return record ? ServicePersistenceMapper.toDomain(record) : null;
  }

  async list({ page, pageSize }: ServiceListQuery): Promise<ServicePage> {
    const [records, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.service.count(),
    ]);

    return { items: records.map((record) => ServicePersistenceMapper.toDomain(record)), total };
  }

  async create(service: Service): Promise<void> {
    try {
      await this.prisma.service.create({ data: ServicePersistenceMapper.toPersistence(service) });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async update(service: Service): Promise<void> {
    const { id, createdAt: _createdAt, ...data } = ServicePersistenceMapper.toPersistence(service);

    try {
      await this.prisma.service.update({ where: { id }, data });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async delete(id: ServiceId): Promise<void> {
    try {
      await this.prisma.service.delete({ where: { id } });
    } catch (error) {
      throw translateWriteError(error);
    }
  }
}
