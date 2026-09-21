import type { Container } from 'inversify';

/**
 * Ponto de extensao para ligar interfaces de repositorio do dominio as suas
 * implementacoes Prisma na infraestrutura.
 *
 * Exemplo:
 * container.bind<ExampleRepository>(TYPES.ExampleRepository)
 *   .to(PrismaExampleRepository)
 *   .inSingletonScope();
 */
export function configureRepositories(_container: Container): void {}
