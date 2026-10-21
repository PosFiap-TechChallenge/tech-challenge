import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

/**
 * Integracao contra um PostgreSQL real, num banco proprio (`techchallenge_test`)
 * recriado a cada execucao pelo globalSetup: nunca toca no banco de desenvolvimento.
 * Usa as credenciais/porta do `.env` (o mesmo banco do `docker compose up -d database`);
 * `TEST_DATABASE_URL` sobrescreve a URL inteira (ex.: no CI).
 */
const fileEnv: Record<string, string | undefined> = existsSync('.env')
  ? parseEnv(readFileSync('.env', 'utf8'))
  : {};
const variable = (key: string, fallback: string): string =>
  process.env[key] ?? fileEnv[key] ?? fallback;

const databaseUrl =
  variable('TEST_DATABASE_URL', '') ||
  `postgresql://${variable('DB_USER', 'postgres')}:${variable('DB_PASSWORD', 'postgres')}` +
    `@localhost:${variable('DB_PORT', '5432')}/techchallenge_test?schema=public`;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.spec.ts'],
    globalSetup: ['test/integration/globalSetup.ts'],
    // Os testes compartilham o banco: arquivos rodam um de cada vez.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      CORS_ORIGIN: '*',
      JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
    },
  },
});
