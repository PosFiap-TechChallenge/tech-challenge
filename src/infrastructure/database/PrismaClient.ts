import { PrismaClient } from '@prisma/client';

/**
 * A conexao e preguicosa: o Prisma so abre socket com o PostgreSQL na primeira
 * query, o que permite que a API suba e responda /health sem banco disponivel.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasourceUrl: databaseUrl,
    log: ['warn', 'error'],
  });
}
