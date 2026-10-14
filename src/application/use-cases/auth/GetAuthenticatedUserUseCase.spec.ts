import { beforeEach, describe, expect, it } from 'vitest';
import type { UserId } from '../../../domain/aggregates/User.ts';
import { makeUserRepositoryMock } from '../../../domain/test/mocks/AuthMocks.ts';
import { makeUser } from '../../../domain/test/mocks/UserMock.ts';
import { ForbiddenError, UnauthorizedError } from '../../exceptions/AppError.ts';
import { GetAuthenticatedUserUseCase } from './GetAuthenticatedUserUseCase.ts';

describe('GetAuthenticatedUserUseCase', () => {
  const userRepository = makeUserRepositoryMock();
  const useCase = new GetAuthenticatedUserUseCase(userRepository);

  beforeEach(() => {
    userRepository.findById.mockReset();
  });

  it('retorna os dados do usuario dono do token', async () => {
    const user = makeUser();
    userRepository.findById.mockResolvedValue(user);

    const output = await useCase.execute(user.id);

    expect(userRepository.findById).toHaveBeenCalledWith(user.id);
    expect(output).toMatchObject({ id: user.id, email: user.email, role: user.role });
  });

  it('rejeita com 401 quando o usuario do token nao existe mais', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('id-removido' as UserId)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('rejeita com 403 quando o usuario do token foi desativado', async () => {
    userRepository.findById.mockResolvedValue(makeUser({ active: false }));

    await expect(useCase.execute(makeUser().id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
