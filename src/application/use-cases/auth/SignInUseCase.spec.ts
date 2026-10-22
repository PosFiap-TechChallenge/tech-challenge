import { beforeEach, describe, expect, it } from 'vitest';
import {
  makePasswordHasherMock,
  makeTokenProviderMock,
  makeUserRepositoryMock,
} from '../../../domain/test/mocks/AuthMocks.ts';
import { makeUser } from '../../../domain/test/mocks/UserMock.ts';
import { signInInputSchema } from '../../dto/inputs/SignInInput.ts';
import { ForbiddenError, UnauthorizedError } from '../../exceptions/AppError.ts';
import { SignInUseCase } from './SignInUseCase.ts';

describe('SignInUseCase', () => {
  const userRepository = makeUserRepositoryMock();
  const passwordHasher = makePasswordHasherMock();
  const tokenProvider = makeTokenProviderMock();
  const useCase = new SignInUseCase(userRepository, passwordHasher, tokenProvider);

  const input = signInInputSchema.parse({ email: 'ANA@oficina.com', password: 'Oficina123' });

  beforeEach(() => {
    userRepository.findByEmail.mockReset();
    passwordHasher.compare.mockReset();
    tokenProvider.sign.mockReset();
  });

  it('retorna token de acesso e dados do usuario para credenciais validas', async () => {
    const user = makeUser();
    userRepository.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(true);
    tokenProvider.sign.mockResolvedValue({
      accessToken: 'jwt',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });

    const output = await useCase.execute(input);

    expect(userRepository.findByEmail).toHaveBeenCalledWith('ana@oficina.com');
    expect(passwordHasher.compare).toHaveBeenCalledWith('Oficina123', user.passwordHash);
    expect(tokenProvider.sign).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    expect(output).toEqual({
      accessToken: 'jwt',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: true,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  });

  it('rejeita com INVALID_CREDENTIALS quando o e-mail nao existe', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    });
    expect(tokenProvider.sign).not.toHaveBeenCalled();
  });

  it('rejeita com INVALID_CREDENTIALS quando a senha nao confere', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser());
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(tokenProvider.sign).not.toHaveBeenCalled();
  });

  it('rejeita com 403 quando o usuario esta inativo mesmo com senha correta', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser({ active: false }));
    passwordHasher.compare.mockResolvedValue(true);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(tokenProvider.sign).not.toHaveBeenCalled();
  });

  it('nao revela que o usuario esta inativo quando a senha esta errada', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser({ active: false }));
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});
