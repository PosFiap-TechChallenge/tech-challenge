import { Prisma, type PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import { ConflictError, NotFoundError } from '../../../application/exceptions/AppError.ts';
import type { Vehicle, VehicleId } from '../../../domain/aggregates/Vehicle.ts';
import type {
  VehicleListQuery,
  VehiclePage,
  VehicleRepository,
} from '../../../domain/repositories/VehicleRepository.ts';
import type { LicensePlate } from '../../../domain/value-objects/LicensePlate.ts';
import { VehiclePersistenceMapper } from '../mappers/VehiclePersistenceMapper.ts';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';
const RECORD_NOT_FOUND = 'P2025';

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function translateWriteError(error: unknown): unknown {
  if (hasPrismaErrorCode(error, UNIQUE_CONSTRAINT_VIOLATION)) {
    return new ConflictError('Veiculo', 'placa');
  }

  if (hasPrismaErrorCode(error, FOREIGN_KEY_VIOLATION)) {
    return new NotFoundError('Cliente');
  }

  if (hasPrismaErrorCode(error, RECORD_NOT_FOUND)) {
    return new NotFoundError('Veiculo');
  }

  return error;
}

@injectable()
export class PrismaVehicleRepository implements VehicleRepository {
  constructor(
    @inject(TYPES.PrismaClient)
    private readonly prisma: PrismaClient,
  ) {}

  async findById(id: VehicleId): Promise<Vehicle | null> {
    const record = await this.prisma.vehicle.findUnique({ where: { id } });

    return record ? VehiclePersistenceMapper.toDomain(record) : null;
  }

  async findByPlate(plate: LicensePlate): Promise<Vehicle | null> {
    const record = await this.prisma.vehicle.findUnique({ where: { plate: plate.value } });

    return record ? VehiclePersistenceMapper.toDomain(record) : null;
  }

  async list({ page, pageSize, customerId }: VehicleListQuery): Promise<VehiclePage> {
    const where: Prisma.VehicleWhereInput = customerId === undefined ? {} : { customerId };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items: records.map((record) => VehiclePersistenceMapper.toDomain(record)), total };
  }

  async create(vehicle: Vehicle): Promise<void> {
    try {
      await this.prisma.vehicle.create({ data: VehiclePersistenceMapper.toPersistence(vehicle) });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async update(vehicle: Vehicle): Promise<void> {
    const { id, createdAt: _createdAt, ...data } = VehiclePersistenceMapper.toPersistence(vehicle);

    try {
      await this.prisma.vehicle.update({ where: { id }, data });
    } catch (error) {
      throw translateWriteError(error);
    }
  }

  async delete(id: VehicleId): Promise<void> {
    try {
      await this.prisma.vehicle.delete({ where: { id } });
    } catch (error) {
      throw translateWriteError(error);
    }
  }
}
