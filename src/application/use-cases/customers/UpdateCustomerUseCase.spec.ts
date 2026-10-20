import { beforeEach, describe, expect, it } from 'vitest';
import type { CustomerId } from '../../../domain/aggregates/Customer.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { CUSTOMER_ID, makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { ConflictError, NotFoundError } from '../../exceptions/AppError.ts';
import { UpdateCustomerUseCase } from './UpdateCustomerUseCase.ts';

const customerId = CUSTOMER_ID as CustomerId;

describe('UpdateCustomerUseCase', () => {
  const customerRepository = makeCustomerRepositoryMock();
  const useCase = new UpdateCustomerUseCase(customerRepository);

  beforeEach(() => {
    customerRepository.findById.mockReset();
    customerRepository.findByDocument.mockReset();
    customerRepository.update.mockReset();
  });

  it('atualiza os campos informados e persiste', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());

    const output = await useCase.execute(customerId, { name: 'Maria Souza', phone: null });

    expect(customerRepository.update).toHaveBeenCalledOnce();
    expect(customerRepository.findByDocument).not.toHaveBeenCalled();
    expect(output).toMatchObject({ name: 'Maria Souza', phone: null, email: 'joao@email.com' });
  });

  it('permite trocar para um documento livre', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());
    customerRepository.findByDocument.mockResolvedValue(null);

    const output = await useCase.execute(customerId, { document: '11.222.333/0001-81' });

    expect(output).toMatchObject({ document: '11222333000181', documentType: 'CNPJ' });
  });

  it('permite reenviar o proprio documento', async () => {
    const customer = makeCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    customerRepository.findByDocument.mockResolvedValue(makeCustomer());

    await useCase.execute(customerId, { document: '529.982.247-25' });

    expect(customerRepository.update).toHaveBeenCalledWith(customer);
  });

  it('rejeita com ConflictError quando o documento pertence a outro cliente', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());
    customerRepository.findByDocument.mockResolvedValue(
      makeCustomer({ id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d', document: '11222333000181' }),
    );

    await expect(
      useCase.execute(customerId, { document: '11.222.333/0001-81' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(customerRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita com NotFoundError quando o cliente nao existe', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(customerId, { name: 'Maria' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(customerRepository.update).not.toHaveBeenCalled();
  });

  it('rejeita dados invalidos sem persistir', async () => {
    customerRepository.findById.mockResolvedValue(makeCustomer());

    await expect(useCase.execute(customerId, { email: 'invalido' })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(customerRepository.update).not.toHaveBeenCalled();
  });
});
