import 'reflect-metadata';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { TYPES } from '../../../application/dto/Types.ts';
import { ConflictError } from '../../../application/exceptions/AppError.ts';
import type { RegisterUserUseCase } from '../../../application/use-cases/auth/RegisterUserUseCase.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { container } from '../../di/Container.ts';
import { logger } from '../../logger/Logger.ts';

const seedEnvSchema = z.object({
  ADMIN_NAME: z.string().min(1).default('Administrador'),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
});

async function seedAdmin(): Promise<void> {
  const seedEnv = seedEnvSchema.parse(process.env);

  const registerUser = container.get<RegisterUserUseCase>(TYPES.RegisterUserUseCase);

  const admin = await registerUser.execute({
    name: seedEnv.ADMIN_NAME,
    email: seedEnv.ADMIN_EMAIL,
    password: seedEnv.ADMIN_PASSWORD,
    role: UserRole.ADMIN,
  });

  logger.info('usuario ADMIN criado', { id: admin.id, email: admin.email });
}

async function disconnect(): Promise<void> {
  await container.get<PrismaClient>(TYPES.PrismaClient).$disconnect();
}

seedAdmin()
  .catch((error: unknown) => {
    if (error instanceof ConflictError) {
      logger.info('usuario ADMIN ja existe, nada a fazer');
      return;
    }

    logger.error('falha ao criar usuario ADMIN', {
      reason: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(disconnect);
