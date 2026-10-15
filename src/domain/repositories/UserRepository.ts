import type { User, UserId } from '../aggregates/User.ts';

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  /** Espera o e-mail ja normalizado por `User.normalizeEmail`. */
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<void>;
}
