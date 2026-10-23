import type { DomainEvent } from '../../domain/shared/DomainEvent.ts';

/** Reage a um evento pelo nome (`DomainEvent.name`); registrado na DI sob `TYPES.DomainEventHandler`. */
export interface DomainEventHandler<Event extends DomainEvent = DomainEvent> {
  readonly eventName: string;
  handle(event: Event): Promise<void>;
}
