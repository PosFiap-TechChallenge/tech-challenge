import { beforeEach, describe, expect, it } from 'vitest';
import type { PartId } from '../../../domain/aggregates/Part.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makePart, PART_ID } from '../../../domain/test/mocks/PartMock.ts';
import {
  makeEventPublisherMock,
  makePartRepositoryMock,
} from '../../../domain/test/mocks/PartRepositoryMock.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { PartCommandRunner } from './PartCommandRunner.ts';
import { UpdatePartUseCase } from './UpdatePartUseCase.ts';

const OTHER_PART_ID = '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b';

describe('UpdatePartUseCase', () => {
  const partRepository = makePartRepositoryMock();
  const useCase = new UpdatePartUseCase(
    new PartCommandRunner(partRepository, makeEventPublisherMock()),
    partRepository,
  );
  const id = PART_ID as PartId;

  beforeEach(() => {
    partRepository.findById.mockReset();
    partRepository.findByCode.mockReset();
    partRepository.updateAll.mockReset();
  });

  it('atualiza nome e estoque minimo sem mexer nos saldos nem registrar movimentacao', async () => {
    partRepository.findById.mockResolvedValue(makePart({ quantity: 10, reserved: 2 }));

    const output = await useCase.execute(id, { name: ' Filtro de oleo Tecfil ', minimumStock: 12 });

    const savedPart = partRepository.updateAll.mock.calls[0]?.[0][0];

    expect(savedPart?.pendingMovements).toHaveLength(0);
    expect(partRepository.findByCode).not.toHaveBeenCalled();
    expect(output).toMatchObject({
      name: 'Filtro de oleo Tecfil',
      minimumStock: 12,
      quantity: 10,
      reserved: 2,
      belowMinimum: true,
    });
  });

  it('troca o codigo quando ele esta livre', async () => {
    partRepository.findById.mockResolvedValue(makePart());
    partRepository.findByCode.mockResolvedValue(null);

    const output = await useCase.execute(id, { code: 'flt-oleo-02' });

    expect(partRepository.findByCode).toHaveBeenCalledWith('FLT-OLEO-02');
    expect(output.code).toBe('FLT-OLEO-02');
  });

  it('aceita reenviar o proprio codigo', async () => {
    partRepository.findById.mockResolvedValue(makePart());
    partRepository.findByCode.mockResolvedValue(makePart());

    await expect(useCase.execute(id, { code: 'FLT-OLEO-01' })).resolves.toMatchObject({
      code: 'FLT-OLEO-01',
    });
  });

  it('rejeita com ConflictError quando o codigo pertence a outra peca', async () => {
    partRepository.findById.mockResolvedValue(makePart());
    partRepository.findByCode.mockResolvedValue(makePart({ id: OTHER_PART_ID }));

    await expect(useCase.execute(id, { code: 'OUTRA' })).rejects.toBeInstanceOf(ConflictError);
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });

  it('rejeita com NotFoundError quando a peca nao existe', async () => {
    partRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(id, { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('nao persiste estoque minimo invalido', async () => {
    partRepository.findById.mockResolvedValue(makePart());

    await expect(useCase.execute(id, { minimumStock: -1 })).rejects.toBeInstanceOf(DomainError);
    expect(partRepository.updateAll).not.toHaveBeenCalled();
  });
});
