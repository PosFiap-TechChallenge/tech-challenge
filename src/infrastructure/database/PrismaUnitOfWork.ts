import type { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import type { UnitOfWork } from '../../domain/providers/UnitOfWork.ts';
import { runInTransaction } from './TransactionContext.ts';

@injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    @inject(TYPES.PrismaClient)
    private readonly prisma: PrismaClient,
  ) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return runInTransaction(this.prisma, () => work());
  }
}
