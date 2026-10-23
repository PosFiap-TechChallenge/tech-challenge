import { inject, injectable } from 'inversify';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import type { PartOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';

@injectable()
export class GetPartByIdUseCase {
  constructor(
    @inject(TYPES.PartRepository)
    private readonly partRepository: PartRepository,
  ) {}

  async execute(id: PartId): Promise<PartOutput> {
    const part = await this.partRepository.findById(id);

    if (!part) {
      throw new NotFoundError('Peca');
    }

    return PartResponseMapper.toResponse(part);
  }
}
