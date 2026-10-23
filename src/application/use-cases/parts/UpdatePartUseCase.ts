import { inject, injectable } from 'inversify';
import type { Part, PartId } from '../../../domain/aggregates/Part.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import type { UpdatePartInput } from '../../dto/inputs/UpdatePartInput.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';
import type { PartCommandRunner } from './PartCommandRunner.ts';

/** Edita codigo, nome e estoque minimo; saldos so mudam pelos comandos de estoque. */
@injectable()
export class UpdatePartUseCase {
  constructor(
    @inject(TYPES.PartCommandRunner)
    private readonly partCommandRunner: PartCommandRunner,
    @inject(TYPES.PartRepository)
    private readonly partRepository: PartRepository,
  ) {}

  async execute(id: PartId, input: UpdatePartInput): Promise<PartOutput> {
    const part = await this.partCommandRunner.run(
      id,
      async (target) => {
        target.update(input);

        if (input.code !== undefined) {
          await this.assertCodeIsAvailable(target);
        }
      },
      { retryOnConcurrentUpdate: true },
    );

    return PartResponseMapper.toResponse(part);
  }

  private async assertCodeIsAvailable(part: Part): Promise<void> {
    const codeOwner = await this.partRepository.findByCode(part.code);

    if (codeOwner && !codeOwner.equals(part)) {
      throw new ConflictError('Peca', 'codigo');
    }
  }
}
