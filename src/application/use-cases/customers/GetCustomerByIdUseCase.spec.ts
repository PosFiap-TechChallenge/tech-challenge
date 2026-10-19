import { beforeEach, describe, expect, it } from 'vitest';
import type { CustomerId } from '../../../domain/aggregates/Customer.ts';
import { CUSTOMER_ID, makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { GetCustomerByIdUseCase } from './GetCustomerByIdUseCase.ts';

describe('GetCustomerByIdUseCase', () => {
  const customerRepository = makeCustomerRepositoryMock();
  const useCase = new GetCustomerByIdUseCase(customerRepository);

  beforeEach(() => {
    customerRepository.findById.mockReset();
  });

  it('retorna o cliente encontrado', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());

    const output = await useCase.execute(CUSTOMER_ID as CustomerId);

    expect(customerRepository.findById).toHaveBeenCalledWith(CUSTOMER_ID);
    expect(output).toMatchObject({ id: CUSTOMER_ID, document: '52998224725' });
  });

  it('rejeita com NotFoundError quando o cliente nao existe', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(CUSTOMER_ID as CustomerId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('propaga erro do repositorio', async () => {
    customerRepository.findById.mockRejectedValue(new Error('conexao recusada'));

    await expect(useCase.execute(CUSTOMER_ID as CustomerId)).rejects.toThrow('conexao recusada');
  });
});
