import { setTimeout as sleep } from 'node:timers/promises';
import { inject, injectable } from 'inversify';
import type { Part, PartId } from '../../../domain/aggregates/Part.ts';
import type { EventPublisher } from '../../../domain/providers/EventPublisher.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConcurrentUpdateError, NotFoundError } from '../../exceptions/AppError.ts';

export const PART_COMMAND_MAX_ATTEMPTS = 5;

/** Espera aleatoria e crescente entre tentativas, para que escritas concorrentes nao colidam de novo. */
const RETRY_JITTER_MS = 20;

export type PartCommandOptions = {
  /**
   * Repete a partir de uma nova leitura quando outra operacao alterou a peca.
   * Seguro para comandos relativos ao saldo (entrada, reserva, consumo); nao para
   * o ajuste, que grava uma contagem absoluta feita sobre o saldo antigo.
   */
  retryOnConcurrentUpdate: boolean;
};

/**
 * Carrega as pecas, aplica o comando, persiste tudo numa unica transacao e so
 * entao publica os eventos gerados. Em lote, e tudo ou nada: se o comando falhar
 * em qualquer peca, nenhuma e gravada.
 */
@injectable()
export class PartCommandRunner {
  constructor(
    @inject(TYPES.PartRepository)
    private readonly partRepository: PartRepository,
    @inject(TYPES.EventPublisher)
    private readonly eventPublisher: EventPublisher,
  ) {}

  async run(
    id: PartId,
    command: (part: Part) => void | Promise<void>,
    options: PartCommandOptions,
  ): Promise<Part> {
    const [part] = await this.runBatch([id], ([target]) => command(target as Part), options);

    return part as Part;
  }

  /** `command` recebe as pecas na mesma ordem de `ids`. */
  async runBatch(
    ids: readonly PartId[],
    command: (parts: Part[]) => void | Promise<void>,
    { retryOnConcurrentUpdate }: PartCommandOptions,
  ): Promise<Part[]> {
    const maxAttempts = retryOnConcurrentUpdate ? PART_COMMAND_MAX_ATTEMPTS : 1;

    for (let attempt = 1; ; attempt++) {
      const parts = await Promise.all(ids.map((id) => this.load(id)));

      await command(parts);

      try {
        await this.partRepository.updateAll(parts);
      } catch (error) {
        if (error instanceof ConcurrentUpdateError && attempt < maxAttempts) {
          await sleep(Math.random() * RETRY_JITTER_MS * attempt);
          continue;
        }

        throw error;
      }

      for (const part of parts) {
        await this.eventPublisher.publish(part.raisedEvents);
        part.clearEvents();
      }

      return parts;
    }
  }

  private async load(id: PartId): Promise<Part> {
    const part = await this.partRepository.findById(id);

    if (!part) {
      throw new NotFoundError('Peca');
    }

    return part;
  }
}
