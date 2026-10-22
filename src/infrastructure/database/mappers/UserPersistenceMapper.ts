import type { User as UserRecord } from '@prisma/client';
import { User } from '../../../domain/aggregates/User.ts';

export class UserPersistenceMapper {
  static toDomain(record: UserRecord): User {
    return User.from(record);
  }

  static toPersistence(user: User): UserRecord {
    return user.toData();
  }
}
