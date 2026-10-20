import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import { makeCustomer } from '../../../domain/test/mocks/CustomerMock.ts';
import { makeCustomerRepositoryMock } from '../../../domain/test/mocks/CustomerRepositoryMock.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { CreateCustomerUseCase } from './CreateCustomerUseCase.ts';

describe('CreateCustomerUseCase', () => {
  const customerRepository = makeCustomerRepositoryMock();
  const useCase = new CreateCustomerUseCase(customerRepository);

  const input = {
    name: 'Joao da Silva',
    document: '529.982.247-25',
    email: 'joao@email.com',
    phone: '(11) 98765-4321',
  };

  beforeEach(() => {
    customerRepository.findByDocument.mockReset();
    customerRepository.create.mockReset();
  });

  it('cadastra o cliente e retorna os dados normalizados', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);

    const output = await useCase.execute(input);

    const createdCustomer = customerRepository.create.mock.calls[0]?.[0];

    expect(createdCustomer?.id).toBe(output.id);
    expect(customerRepository.findByDocument.mock.calls[0]?.[0].value).toBe('52998224725');
    expect(output).toMatchObject({
      name: 'Joao da Silva',
      document: '52998224725',
      documentType: 'CPF',
      email: 'joao@email.com',
      phone: '11987654321',
    });
  });

  it('rejeita com ConflictError quando o documento ja esta cadastrado', async () => {
    customerRepository.findByDocument.mockResolvedValue(makeCustomer());

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
    expect(customerRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita documento invalido antes de consultar o repositorio', async () => {
    await expect(useCase.execute({ ...input, document: '111.111.111-11' })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(customerRepository.findByDocument).not.toHaveBeenCalled();
  });

  it('rejeita telefone invalido antes de consultar o repositorio', async () => {
    await expect(useCase.execute({ ...input, phone: '123' })).rejects.toBeInstanceOf(DomainError);
    expect(customerRepository.findByDocument).not.toHaveBeenCalled();
  });

  it('propaga ConflictError do repositorio em cadastro concorrente', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.create.mockRejectedValue(new ConflictError('Cliente', 'documento'));

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
  });
});
