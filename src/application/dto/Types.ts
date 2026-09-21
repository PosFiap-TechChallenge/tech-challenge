export const TYPES = {
  // Infraestrutura
  PrismaClient: Symbol.for('PrismaClient'),
  DatabaseUrl: Symbol.for('DatabaseUrl'),

  // Repositorios
  // ExampleRepository: Symbol.for('ExampleRepository'),

  // Casos de uso
  GetHealthUseCase: Symbol.for('GetHealthUseCase'),

  // Controllers
  HealthController: Symbol.for('HealthController'),
} as const;

export type Types = typeof TYPES;
