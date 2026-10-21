import { inject, injectable } from 'inversify';
import { Part } from '../../../domain/aggregates/Part.ts';
import type { EventPublisher } from '../../../domain/providers/EventPublisher.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import type { CreatePartInput } from '../../dto/inputs/CreatePartInput.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';

/** Cadastrar Peca: cria a peca ja com o estoque inicial registrado. */
@injectable()
export class CreatePartUseCase {
  constructor(
    @inject(TYPES.PartRepository)
    private readonly partRepository: PartRepository,
    @inject(TYPES.EventPublisher)
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CreatePartInput): Promise<PartOutput> {
    const part = Part.create(input);

    const existingPart = await this.partRepository.findByCode(part.code);

    if (existingPart) {
      throw new ConflictError('Peca', 'codigo');
    }

    await this.partRepository.create(part);
    await this.eventPublisher.publish(part.raisedEvents);
    part.clearEvents();

    return PartResponseMapper.toResponse(part);
  }
}
