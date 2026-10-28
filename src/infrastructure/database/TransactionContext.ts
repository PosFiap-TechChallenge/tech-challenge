import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma, PrismaClient } from '@prisma/client';

export type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const TRANSACTION_MAX_WAIT_MS = 10_000;
const TRANSACTION_TIMEOUT_MS = 15_000;

const activeTransaction = new AsyncLocalStorage<Prisma.TransactionClient>();

/** Cliente da transacao em andamento neste fluxo assincrono; sem transacao, o cliente base. */
export function currentClient(prisma: PrismaClient): DatabaseClient {
  return activeTransaction.getStore() ?? prisma;
}

export function isInTransaction(): boolean {
  return activeTransaction.getStore() !== undefined;
}

/**
 * Executa `work` numa transacao e a deixa visivel para os repositorios chamados dentro
 * dele. Se ja houver uma transacao em andamento, `work` entra nela: a confirmacao ou o
 * desfazimento fica com quem a abriu.
 */
export function runInTransaction<T>(
  prisma: PrismaClient,
  work: (client: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const active = activeTransaction.getStore();

  if (active) {
    return work(active);
  }

  return prisma.$transaction((tx) => activeTransaction.run(tx, () => work(tx)), {
    maxWait: TRANSACTION_MAX_WAIT_MS,
    timeout: TRANSACTION_TIMEOUT_MS,
  });
}
