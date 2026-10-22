import { User } from '../../aggregates/User.ts';
import type { UserData } from '../../schemas/UserSchema.ts';
import { UserRole } from '../../value-objects/UserRole.ts';

export function makeUser(overrides: Partial<UserData> = {}): User {
  return User.from({
    id: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b',
    name: 'Ana Administradora',
    email: 'ana@oficina.com',
    passwordHash: 'salt:hash',
    role: UserRole.ADMIN,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}
