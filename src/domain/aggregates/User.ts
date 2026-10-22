import type { z } from 'zod';
import { UserCreatedEvent } from '../events/UserCreatedEvent.ts';
import type { PasswordHasher } from '../providers/PasswordHasher.ts';
import { passwordSchema } from '../schemas/PasswordSchema.ts';
import { userSchema, type UserData } from '../schemas/UserSchema.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { generateId } from '../shared/Entity.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import type { UserRole } from '../value-objects/UserRole.ts';

export type UserId = Brand<string, 'UserId'>;

type UserProps = Omit<UserData, 'id'>;

const ERROR_CODES = {
  name: 'INVALID_USER_NAME',
  email: 'INVALID_EMAIL',
  passwordHash: 'INVALID_PASSWORD_HASH',
  role: 'INVALID_USER_ROLE',
};

export class User extends AggregateRoot<UserProps, UserId> {
  private constructor(props: UserProps, id: UserId) {
    super(props, id);
  }

  static async create(
    input: Pick<UserData, 'name' | 'email' | 'role'> & { password: string },
    passwordHasher: PasswordHasher,
  ): Promise<User> {
    const password = parseSchema(passwordSchema(), input.password, {}, 'WEAK_PASSWORD');

    const passwordHash = await passwordHasher.hash(password);

    const now = new Date();

    const user = User.from({
      id: generateId<UserId>(),
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    user.raiseEvent(new UserCreatedEvent({ userId: user.id, role: user.role }));

    return user;
  }

  static from(data: z.input<typeof userSchema>): User {
    const { id, ...props } = parseSchema(userSchema, data, ERROR_CODES, 'INVALID_USER');

    return new User(props, id as UserId);
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get active(): boolean {
    return this.props.active;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toData(): UserData {
    return { ...this.props, id: this.id };
  }

  verifyPassword(plainPassword: string, passwordHasher: PasswordHasher): Promise<boolean> {
    return passwordHasher.compare(plainPassword, this.props.passwordHash);
  }

  canAuthenticate(): boolean {
    return this.props.active;
  }

  deactivate(): void {
    this.props.active = false;
    this.props.updatedAt = new Date();
  }
}
