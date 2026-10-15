import type { DomainEvent } from './DomainEvent.ts';
import { Entity } from './Entity.ts';

export abstract class AggregateRoot<
  Props extends object,
  Id extends string = string,
> extends Entity<Props, Id> {
  private readonly events: DomainEvent[] = [];

  get raisedEvents(): readonly DomainEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events.length = 0;
  }

  protected raiseEvent(event: DomainEvent): void {
    this.events.push(event);
  }
}
