import { injectable } from 'inversify';
import type { DomainEventHandler } from '../../../application/events/DomainEventHandler.ts';
import type { MinimumStockReachedEvent } from '../../../domain/events/MinimumStockReachedEvent.ts';
import { logger } from '../../logger/Logger.ts';

/**
 * Politica "estoque minimo atingido": por enquanto o alerta vai para o log;
 * a lista de reposicao fica em `GET /parts?belowMinimum=true`.
 */
@injectable()
export class MinimumStockReachedAlertHandler implements DomainEventHandler<MinimumStockReachedEvent> {
  readonly eventName = 'MinimumStockReachedEvent';

  async handle(event: MinimumStockReachedEvent): Promise<void> {
    logger.warn('estoque minimo atingido', event.payload);
  }
}
