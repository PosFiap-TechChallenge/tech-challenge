import type { DomainEvent } from '../shared/DomainEvent.ts';

/** Entrega eventos ja persistidos aos handlers interessados (politicas, notificacoes). */
export interface EventPublisher {
  publish(events: readonly DomainEvent[]): Promise<void>;
}
