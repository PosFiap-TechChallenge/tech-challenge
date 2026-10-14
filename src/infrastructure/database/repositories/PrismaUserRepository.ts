import { Prisma, type PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import { ConflictError } from '../../../application/exceptions/AppError.ts';
import type { User, UserId } from '../../../domain/aggregates/User.ts';
import type { UserRepository } from '../../../domain/repositories/UserRepository.ts';
import { UserPersistenceMapper } from '../mappers/UserPersistenceMapper.ts';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_VIOLATION
  );
}

@injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    @inject(TYPES.PrismaClient)
    private readonly prisma: PrismaClient,
  ) {}

  async findById(id: UserId): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });

    return record ? UserPersistenceMapper.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });

    return record ? UserPersistenceMapper.toDomain(record) : null;
  }

  async create(user: User): Promise<void> {
    try {
      await this.prisma.user.create({ data: UserPersistenceMapper.toPersistence(user) });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictError('Usuario', 'email');
      }

      throw error;
    }
  }
}
