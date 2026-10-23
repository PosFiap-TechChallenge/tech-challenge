import { defineConfig } from 'vitest/config';

/**
 * Camadas com regra de negocio: o desafio exige no minimo 80% de cobertura nos
 * dominios criticos. O restante entra no relatorio, mas nao bloqueia o build.
 */
const CRITICAL_DOMAIN_THRESHOLD = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
};

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Testes de integracao precisam de PostgreSQL: rodam com `pnpm test:integration`.
    exclude: ['src/**/*.integration.spec.ts'],
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/techchallenge?schema=public',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_DATABASE: 'techchallenge',
      CORS_ORIGIN: '*',
      JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/domain/test/**',
        'src/infrastructure/database/prisma/**',
        'src/infrastructure/database/seed/**',
        'src/infrastructure/server/main.ts',
      ],
      reporter: ['text-summary', 'html'],
      thresholds: {
        'src/domain/**/*.ts': CRITICAL_DOMAIN_THRESHOLD,
        'src/application/**/*.ts': CRITICAL_DOMAIN_THRESHOLD,
      },
    },
  },
});
