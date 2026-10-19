import { beforeEach, describe, expect, it } from 'vitest';
import type { CustomerId } from '../../../domain/aggregates/Customer.ts';
import { CUSTOMER_ID, makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { NotFoundError } from '../../exceptions/AppError.ts';
import { DeleteCustomerUseCase } from './DeleteCustomerUseCase.ts';

const customerId = CUSTOMER_ID as CustomerId;

describe('DeleteCustomerUseCase', () => {
  const customerRepository = makeCustomerRepositoryMock();
  const useCase = new DeleteCustomerUseCase(customerRepository);

  beforeEach(() => {
    customerRepository.findById.mockReset();
    customerRepository.delete.mockReset();
  });

  it('remove o cliente existente', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());

    await useCase.execute(customerId);

    expect(customerRepository.delete).toHaveBeenCalledWith(customerId);
  });

  it('rejeita com NotFoundError quando o cliente nao existe', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(customerId)).rejects.toBeInstanceOf(NotFoundError);
    expect(customerRepository.delete).not.toHaveBeenCalled();
  });

  it('propaga erro do repositorio ao remover', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());
    customerRepository.delete.mockRejectedValue(new Error('conexao recusada'));

    await expect(useCase.execute(customerId)).rejects.toThrow('conexao recusada');
  });
});
