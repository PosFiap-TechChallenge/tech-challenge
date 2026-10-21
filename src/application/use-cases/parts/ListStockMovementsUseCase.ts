import { inject, injectable } from 'inversify';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import type { ListStockMovementsInput } from '../../dto/inputs/ListStockMovementsInput.ts';
import type { StockMovementPageOutput } from '../../dto/outputs/PartOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { PartResponseMapper } from '../../mappers/PartResponseMapper.ts';

/** Historico de movimentacoes da peca, da mais recente para a mais antiga. */
@injectable()
export class ListStockMovementsUseCase {
  constructor(
    @inject(TYPES.PartRepository)
    private readonly partRepository: PartRepository,
  ) {}

  async execute(id: PartId, input: ListStockMovementsInput): Promise<StockMovementPageOutput> {
    const part = await this.partRepository.findById(id);

    if (!part) {
      throw new NotFoundError('Peca');
    }

    const { items, total } = await this.partRepository.listMovements(id, input);

    return {
      items: items.map((movement) => PartResponseMapper.toMovementResponse(movement)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
