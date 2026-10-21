import { inject, injectable } from 'inversify';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import type { RegisterStockEntryInput } from '../../dto/inputs/RegisterStockEntryInput.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';
import type { PartCommandRunner } from './PartCommandRunner.ts';

/** Registrar Entrada: soma a quantidade recebida ao saldo fisico. */
@injectable()
export class RegisterStockEntryUseCase {
  constructor(
    @inject(TYPES.PartCommandRunner)
    private readonly partCommandRunner: PartCommandRunner,
  ) {}

  async execute(id: PartId, input: RegisterStockEntryInput): Promise<PartOutput> {
    const part = await this.partCommandRunner.run(
      id,
      (target) => target.registerEntry(input.quantity),
      {
        retryOnConcurrentUpdate: true,
      },
    );

    return PartResponseMapper.toResponse(part);
  }
}
