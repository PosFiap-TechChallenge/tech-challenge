import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { GetCustomerByDocumentUseCase } from './GetCustomerByDocumentUseCase.ts';

describe('GetCustomerByDocumentUseCase', () => {
  const customerRepository = makeCustomerRepositoryMock();
  const useCase = new GetCustomerByDocumentUseCase(customerRepository);

  beforeEach(() => {
    customerRepository.findByDocument.mockReset();
  });

  it('busca pelo documento normalizado e retorna o cliente', async () => {
    customerRepository.findByDocument.mockResolvedValue(makeCustomer());

    const output = await useCase.execute('529.982.247-25');

    expect(customerRepository.findByDocument.mock.calls[0]?.[0].value).toBe('52998224725');
    expect(output.document).toBe('52998224725');
  });

  it('rejeita com NotFoundError quando nao ha cliente com o documento', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);

    await expect(useCase.execute('11.222.333/0001-81')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita documento invalido sem consultar o repositorio', async () => {
    await expect(useCase.execute('123')).rejects.toBeInstanceOf(DomainError);
    expect(customerRepository.findByDocument).not.toHaveBeenCalled();
  });
});
