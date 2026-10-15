import { DomainError } from '../errors/DomainError.ts';
import { UserCreatedEvent } from '../events/UserCreatedEvent.ts';
import type { PasswordHasher } from '../providers/PasswordHasher.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { generateId } from '../shared/Entity.ts';
import { isUserRole, type UserRole } from '../value-objects/UserRole.ts';

export type UserId = Brand<string, 'UserId'>;

export const USER_NAME_MAX_LENGTH = 120;
export const USER_EMAIL_MAX_LENGTH = 254;
export const USER_PASSWORD_MIN_LENGTH = 8;
export const USER_PASSWORD_MAX_LENGTH = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserProps = {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserPrimitives = UserProps & { id: string };

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export class User extends AggregateRoot<UserProps, UserId> {
  private constructor(props: UserProps, id: UserId) {
    super(props, id);
  }

  private static build(primitives: UserProps): UserProps {
    return {
      name: User.requireValidName(primitives.name),
      email: User.normalizeEmail(primitives.email),
      passwordHash: User.requirePasswordHash(primitives.passwordHash),
      role: User.requireValidRole(primitives.role),
      active: primitives.active,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  static async create(input: CreateUserInput, passwordHasher: PasswordHasher): Promise<User> {
    User.assertPasswordPolicy(input.password);

    const passwordHash = await passwordHasher.hash(input.password);

    const now = new Date();

    const user = new User(
      User.build({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        active: true,
        createdAt: now,
        updatedAt: now,
      }),
      generateId<UserId>(),
    );

    user.raiseEvent(new UserCreatedEvent({ userId: user.id, role: user.role }));

    return user;
  }

  static from(primitives: UserPrimitives): User {
    return new User(User.build(primitives), primitives.id as UserId);
  }

  /**
   * Valida e normaliza (trim + minusculas) o e-mail. Exposto para que buscas por
   * e-mail usem exatamente a mesma forma que o aggregate persiste.
   */
  static normalizeEmail(raw: string): string {
    const email = raw.trim().toLowerCase();

    if (!email) {
      throw new DomainError('E-mail e obrigatorio', 'INVALID_EMAIL');
    }

    if (email.length > USER_EMAIL_MAX_LENGTH) {
      throw new DomainError(
        `E-mail deve ter no maximo ${USER_EMAIL_MAX_LENGTH} caracteres`,
        'INVALID_EMAIL',
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      throw new DomainError('E-mail em formato invalido', 'INVALID_EMAIL');
    }

    return email;
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

  private static assertPasswordPolicy(password: string): void {
    if (password.length < USER_PASSWORD_MIN_LENGTH || password.length > USER_PASSWORD_MAX_LENGTH) {
      throw new DomainError(
        `Senha deve ter entre ${USER_PASSWORD_MIN_LENGTH} e ${USER_PASSWORD_MAX_LENGTH} caracteres`,
        'WEAK_PASSWORD',
      );
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new DomainError('Senha deve conter letras e numeros', 'WEAK_PASSWORD');
    }
  }

  private static requireValidName(raw: string): string {
    const name = raw.trim();

    if (!name) {
      throw new DomainError('Nome do usuario e obrigatorio', 'INVALID_USER_NAME');
    }

    if (name.length > USER_NAME_MAX_LENGTH) {
      throw new DomainError(
        `Nome do usuario deve ter no maximo ${USER_NAME_MAX_LENGTH} caracteres`,
        'INVALID_USER_NAME',
      );
    }

    return name;
  }

  private static requirePasswordHash(passwordHash: string): string {
    if (!passwordHash) {
      throw new DomainError('Hash de senha e obrigatorio', 'INVALID_PASSWORD_HASH');
    }

    return passwordHash;
  }

  private static requireValidRole(role: string): UserRole {
    if (!isUserRole(role)) {
      throw new DomainError(`Papel de usuario desconhecido: ${role}`, 'INVALID_USER_ROLE');
    }

    return role;
  }
}
