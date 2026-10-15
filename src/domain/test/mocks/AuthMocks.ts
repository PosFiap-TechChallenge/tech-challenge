import { vi, type Mocked } from 'vitest';
import type { PasswordHasher } from '../../providers/PasswordHasher.ts';
import type { TokenProvider } from '../../providers/TokenProvider.ts';
import type { UserRepository } from '../../repositories/UserRepository.ts';

export function makeUserRepositoryMock(): Mocked<UserRepository> {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  };
}

export function makePasswordHasherMock(): Mocked<PasswordHasher> {
  return {
    hash: vi.fn(),
    compare: vi.fn(),
  };
}

export function makeTokenProviderMock(): Mocked<TokenProvider> {
  return {
    sign: vi.fn(),
    verify: vi.fn(),
  };
}
