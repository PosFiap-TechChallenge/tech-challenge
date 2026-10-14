import 'reflect-metadata';
import type { PrismaClient } from '@prisma/client';
import { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import { createPrismaClient } from '../database/PrismaClient.ts';
import { env } from '../env/Env.ts';
import { configureControllers } from './Controllers.ts';
import { configureProviders } from './Providers.ts';
import { configureRepositories } from './Repositories.ts';
import { configureUseCases } from './UseCases.ts';

export const container = new Container();

const bindRequiredEnv = (symbol: symbol, key: keyof typeof env): void => {
  container
    .bind<string>(symbol)
    .toDynamicValue(() => {
      const value = env[key] as unknown;

      if (!value) {
        throw new Error(`${String(key)} is not defined in environment variables`);
      }

      return String(value);
    })
    .inSingletonScope();
};

bindRequiredEnv(TYPES.DatabaseUrl, 'DATABASE_URL');

container
  .bind<PrismaClient>(TYPES.PrismaClient)
  .toDynamicValue(() => createPrismaClient(env.DATABASE_URL))
  .inSingletonScope();

configureProviders(container);
configureRepositories(container);
configureUseCases(container);
configureControllers(container);
