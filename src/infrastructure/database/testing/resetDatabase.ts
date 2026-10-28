import type { PrismaClient } from '@prisma/client';

/** Esvazia as tabelas de negocio dos testes de integracao; usuarios nao sao tocados. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE service_orders, stock_movements, parts, services, vehicles, customers CASCADE',
  );
}
