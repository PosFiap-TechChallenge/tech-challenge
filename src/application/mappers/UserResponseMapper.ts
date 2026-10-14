import type { User } from '../../domain/aggregates/User.ts';
import type { UserOutput } from '../dto/outputs/UserOutput.ts';

export class UserResponseMapper {
  static toResponse(user: User): UserOutput {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
