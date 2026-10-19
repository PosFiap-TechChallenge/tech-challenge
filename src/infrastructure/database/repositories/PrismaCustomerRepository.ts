import { Prisma, type PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import { ConflictError, NotFoundError } from '../../../application/exceptions/AppError.ts';
import type { Customer, CustomerId } from '../../../domain/aggregates/Customer.ts';
import type {
  CustomerListQuery,
  CustomerPage,
  CustomerRepository,
} from '../../../domain/repositories/CustomerRepository.ts';
import type { TaxDocument } from '../../../domain/value-objects/TaxDocument.ts';
import { CustomerPersistenceMapper } from '../mappers/CustomerPersistenceMapper.ts';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function translateWriteError(error: unknown): unknown {
  if (hasPrismaErrorCode(error, UNIQUE_CONSTRAINT_VIOLATION)) {
    return new ConflictError('Cliente', 'documento');
  }

  if (hasPrismaErrorCode(error, RECORD_NOT_FOUND)) {
    return new NotFoundError('Cliente');
  }

  return error;
}

@injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(
    @inject(TYPES.PrismaClient)
    private readonly prisma: PrismaClient,
  ) {}

  async findById(id: CustomerId): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({ where: { id } });

    return record ? CustomerPersistenceMapper.toDomain(record) : null;
  }

  async findByDocument(document: TaxDocument): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({ where: { document: document.value } });

    return record ? CustomerPersistenceMapper.toDomain(record) : null;
  }

  async list({ page, pageSize }: CustomerListQuery): Promise<CustomerPage> {
    const [records, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count(),
    ]);

    return { items: records.map((record) => CustomerPersistenceMapper.toDomain(record)), total };
  }

  async create(customer: Customer): Promise<void> {
    try {
      await this.prisma.customer.create({
        data: CustomerPersistenceMapper.toPersistence(customer),
      });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async update(customer: Customer): Promise<void> {
    const {
      id,
      createdAt: _createdAt,
      ...data
    } = CustomerPersistenceMapper.toPersistence(customer);

    try {
      await this.prisma.customer.update({ where: { id }, data });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async delete(id: CustomerId): Promise<void> {
    try {
      await this.prisma.customer.delete({ where: { id } });
    } catch (error) {
      throw translateWriteError(error);
    }
  }
}
