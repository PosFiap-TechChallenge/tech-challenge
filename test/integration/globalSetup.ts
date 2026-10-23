import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { TestProject } from 'vitest/node';

/**
 * Aplica as migrations pendentes no banco de teste (criando-o se nao existir).
 * Nao apaga nada: cada teste limpa as tabelas que usa. A trava abaixo garante
 * que os TRUNCATE dos testes nunca rodem no banco de desenvolvimento.
 */
export default function setup(project: TestProject): void {
  // O globalSetup roda no processo principal, que nao recebe `test.env`: le da config.
  const databaseUrl = String(project.config.env['DATABASE_URL'] ?? '');
  const databaseName = new URL(databaseUrl).pathname.slice(1);

  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Recusando rodar em "${databaseName}": o banco de teste deve terminar em _test`,
    );
  }

  execFileSync(resolve('node_modules/.bin/prisma'), ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
