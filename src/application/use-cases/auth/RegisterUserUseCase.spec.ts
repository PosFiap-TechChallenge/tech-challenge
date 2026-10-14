import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain/errors/DomainError.ts';
import {
  makePasswordHasherMock,
  makeUserRepositoryMock,
} from '../../../domain/test/mocks/AuthMocks.ts';
import { makeUser } from '../../../domain/test/mocks/UserMock.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { RegisterUserUseCase } from './RegisterUserUseCase.ts';

describe('RegisterUserUseCase', () => {
  const userRepository = makeUserRepositoryMock();
  const passwordHasher = makePasswordHasherMock();
  const useCase = new RegisterUserUseCase(userRepository, passwordHasher);

  const input = {
    name: 'Carlos Mecanico',
    email: 'Carlos@Oficina.com',
    password: 'Oficina123',
    role: UserRole.MECHANIC,
  };

  beforeEach(() => {
    userRepository.findByEmail.mockReset();
    userRepository.create.mockReset();
    passwordHasher.hash.mockReset();
  });

  it('cria usuario com senha em hash e retorna os dados sem a senha', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('salt:hash');

    const output = await useCase.execute(input);

    expect(passwordHasher.hash).toHaveBeenCalledWith('Oficina123');

    const createdUser = userRepository.create.mock.calls[0]?.[0];

    expect(createdUser?.passwordHash).toBe('salt:hash');
    expect(createdUser?.email).toBe('carlos@oficina.com');
    expect(output).toMatchObject({
      name: 'Carlos Mecanico',
      email: 'carlos@oficina.com',
      role: UserRole.MECHANIC,
      active: true,
    });
    expect(output).not.toHaveProperty('passwordHash');
    expect(output).not.toHaveProperty('password');
  });

  it('rejeita com ConflictError quando o e-mail ja esta cadastrado', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser({ email: 'carlos@oficina.com' }));

    passwordHasher.hash.mockResolvedValue('salt:hash');

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
    expect(userRepository.findByEmail).toHaveBeenCalledWith('carlos@oficina.com');
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita senha fraca sem gerar hash nem consultar o repositorio', async () => {
    await expect(useCase.execute({ ...input, password: 'semnumero' })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('rejeita e-mail invalido antes de consultar o repositorio', async () => {
    passwordHasher.hash.mockResolvedValue('salt:hash');

    await expect(useCase.execute({ ...input, email: 'invalido' })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('propaga erro do repositorio ao persistir', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('salt:hash');
    userRepository.create.mockRejectedValue(new ConflictError('Usuario', 'email'));

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
  });
});
