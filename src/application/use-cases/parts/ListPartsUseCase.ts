import { inject, injectable } from 'inversify';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import type { ListPartsInput } from '../../dto/inputs/ListPartsInput.ts';
import type { PartPageOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';

@injectable()
export class ListPartsUseCase {
  constructor(
    @inject(TYPES.PartRepository)
    private readonly partRepository: PartRepository,
  ) {}

  async execute(input: ListPartsInput): Promise<PartPageOutput> {
    const { items, total } = await this.partRepository.list(input);

    return {
      items: items.map((part) => PartResponseMapper.toResponse(part)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
