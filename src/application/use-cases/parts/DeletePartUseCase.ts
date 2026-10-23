import { inject, injectable } from 'inversify';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import type { PartRepository } from '../../../domain/repositories/PartRepository.ts';
import { TYPES } from '../../dto/Types.ts';
import { NotFoundError, PartHasStockHistoryError } from '../../exceptions/AppError.ts';

/**
 * Remove uma peca cadastrada por engano. Pecas que ja tiveram entrada, ajuste,
 * reserva ou consumo nao podem ser removidas, para nao apagar o historico do estoque.
 */
@injectable()
export class DeletePartUseCase {
  constructor(
    @inject(TYPES.PartRepository)
    private readonly partRepository: PartRepository,
  ) {}

  async execute(id: PartId): Promise<void> {
    const part = await this.partRepository.findById(id);

    if (!part) {
      throw new NotFoundError('Peca');
    }

    if (await this.partRepository.hasStockHistory(part.id)) {
      throw new PartHasStockHistoryError();
    }

    await this.partRepository.delete(part.id);
  }
}
