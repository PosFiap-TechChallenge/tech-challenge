import { injectable, multiInject, optional } from 'inversify';
import type { DomainEventHandler } from '../../application/events/DomainEventHandler.ts';
import { TYPES } from '../../application/dto/Types.ts';
import type { EventPublisher } from '../../domain/providers/EventPublisher.ts';
import type { DomainEvent } from '../../domain/shared/DomainEvent.ts';
import { logger } from '../logger/Logger.ts';

/**
 * Entrega os eventos aos handlers no mesmo processo, depois que a operacao foi
 * persistida. Falha de um handler e registrada no log e nao desfaz a operacao
 * nem impede os demais handlers.
 */
@injectable()
export class InProcessEventPublisher implements EventPublisher {
  constructor(
    @multiInject(TYPES.DomainEventHandler)
    @optional()
    private readonly handlers: DomainEventHandler[] = [],
  ) {}

  async publish(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const handler of this.handlers.filter(
        (candidate) => candidate.eventName === event.name,
      )) {
        try {
          await handler.handle(event);
        } catch (error) {
          logger.error('falha ao tratar evento de dominio', {
            event: event.name,
            handler: handler.constructor.name,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }
}
