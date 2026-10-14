import type { UserId } from '../aggregates/User.ts';
import { DomainEvent } from '../shared/DomainEvent.ts';
import type { UserRole } from '../value-objects/UserRole.ts';

export type UserCreatedPayload = {
  userId: UserId;
  role: UserRole;
};

export class UserCreatedEvent extends DomainEvent<UserCreatedPayload> {
  readonly name = 'UserCreatedEvent';
}
