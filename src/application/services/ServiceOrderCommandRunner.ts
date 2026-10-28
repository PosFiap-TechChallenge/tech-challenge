import { setTimeout as sleep } from 'node:timers/promises';
import { inject, injectable } from 'inversify';
import type { ServiceOrder, ServiceOrderId } from '../../domain/aggregates/ServiceOrder.ts';
import type { EventPublisher } from '../../domain/providers/EventPublisher.ts';
import type { UnitOfWork } from '../../domain/providers/UnitOfWork.ts';
import type { ServiceOrderRepository } from '../../domain/repositories/ServiceOrderRepository.ts';
import type { DomainEvent } from '../../domain/shared/DomainEvent.ts';
import { TYPES } from '../dto/Types.ts';
import { ConcurrentUpdateError, NotFoundError } from '../exceptions/AppError.ts';

export const ORDER_COMMAND_MAX_ATTEMPTS = 5;

/** Espera aleatoria e crescente entre tentativas, para que escritas concorrentes nao colidam de novo. */
const RETRY_JITTER_MS = 20;

/** Qualquer agregado que acumula eventos de dominio (a OS, as pecas reservadas ou consumidas). */
export type EventSource = {
  readonly raisedEvents: readonly DomainEvent[];
  clearEvents(): void;
};

type CommandEffects = readonly EventSource[] | void;

export type OrderCommand = (order: ServiceOrder) => CommandEffects | Promise<CommandEffects>;

type Outcome = { order: ServiceOrder; touched: readonly EventSource[] };

/**
 * Executa um comando da OS: carrega, aplica, grava e so entao publica os eventos.
 * Tudo o que o comando alterar dentro da unidade de trabalho (a propria OS e, se
 * devolvidas, as pecas de estoque) e confirmado ou desfeito junto. Em conflito de
 * versao a transacao inteira e refeita a partir de uma nova leitura, entao as regras
 * sao reavaliadas sobre o estado novo.
 */
@injectable()
export class ServiceOrderCommandRunner {
  constructor(
    @inject(TYPES.UnitOfWork)
    private readonly unitOfWork: UnitOfWork,
    @inject(TYPES.ServiceOrderRepository)
    private readonly orderRepository: ServiceOrderRepository,
    @inject(TYPES.EventPublisher)
    private readonly eventPublisher: EventPublisher,
  ) {}

  async run(id: ServiceOrderId, command: OrderCommand): Promise<ServiceOrder> {
    const { order, touched } = await this.commit(id, command);

    for (const source of [order, ...touched]) {
      await this.eventPublisher.publish(source.raisedEvents);
      source.clearEvents();
    }

    return order;
  }

  private async commit(id: ServiceOrderId, command: OrderCommand): Promise<Outcome> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.unitOfWork.run(() => this.execute(id, command));
      } catch (error) {
        if (!(error instanceof ConcurrentUpdateError) || attempt >= ORDER_COMMAND_MAX_ATTEMPTS) {
          throw error;
        }

        await sleep(Math.random() * RETRY_JITTER_MS * attempt);
      }
    }
  }

  private async execute(id: ServiceOrderId, command: OrderCommand): Promise<Outcome> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new NotFoundError('Ordem de Servico');
    }

    const touched = (await command(order)) ?? [];

    await this.orderRepository.update(order);

    return { order, touched };
  }
}
