import { randomUUID } from 'node:crypto';

export abstract class Entity<Props extends object, Id extends string = string> {
  protected constructor(
    protected readonly props: Props,
    private readonly entityId: Id,
  ) {}

  get id(): Id {
    return this.entityId;
  }

  equals(other: Entity<Props, Id>): boolean {
    return other.id === this.entityId;
  }
}

export function generateId<Id extends string>(): Id {
  return randomUUID() as Id;
}
