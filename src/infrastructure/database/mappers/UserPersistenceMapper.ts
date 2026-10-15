import type { User as UserRecord } from '@prisma/client';
import { User } from '../../../domain/aggregates/User.ts';

export class UserPersistenceMapper {
  static toDomain(record: UserRecord): User {
    return User.from({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      role: record.role,
      active: record.active,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(user: User): UserRecord {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
