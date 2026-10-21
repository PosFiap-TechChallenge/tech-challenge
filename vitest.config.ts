import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Testes de integracao precisam de PostgreSQL: rodam com `pnpm test:integration`.
    exclude: ['src/**/*.integration.spec.ts'],
    coverage: {
      provider: 'v8',
      // Dominios criticos: regras de negocio (domain) e casos de uso (application).
      include: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
      exclude: ['**/*.spec.ts', 'src/domain/test/**'],
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
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
  },
});
