import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from './ScryptPasswordHasher.ts';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('gera hash diferente da senha em texto puro', async () => {
    const hash = await hasher.hash('Oficina123');

    expect(hash).not.toContain('Oficina123');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('confirma a senha correta', async () => {
    const hash = await hasher.hash('Oficina123');

    await expect(hasher.compare('Oficina123', hash)).resolves.toBe(true);
  });

  it('rejeita a senha incorreta', async () => {
    const hash = await hasher.hash('Oficina123');

    await expect(hasher.compare('Oficina124', hash)).resolves.toBe(false);
  });

  it('gera hashes distintos para a mesma senha por usar salt aleatorio', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('Oficina123'),
      hasher.hash('Oficina123'),
    ]);

    expect(first).not.toBe(second);
  });

  it('retorna false para hash em formato desconhecido', async () => {
    await expect(hasher.compare('Oficina123', 'hash-corrompido')).resolves.toBe(false);
    await expect(hasher.compare('Oficina123', 'scrypt$zz$')).resolves.toBe(false);
    await expect(hasher.compare('Oficina123', '')).resolves.toBe(false);
  });
});
