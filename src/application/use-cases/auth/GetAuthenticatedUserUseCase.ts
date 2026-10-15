import { inject, injectable } from 'inversify';
import type { UserId } from '../../../domain/aggregates/User.ts';
import type { UserRepository } from '../../../domain/repositories/UserRepository.ts';
import type { UserOutput } from '../../dto/outputs/UserOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ForbiddenError, UnauthorizedError } from '../../exceptions/AppError.ts';
import { UserResponseMapper } from '../../mappers/UserResponseMapper.ts';

@injectable()
export class GetAuthenticatedUserUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: UserId): Promise<UserOutput> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('Usuario do token nao existe mais', 'USER_NOT_FOUND');
    }

    if (!user.canAuthenticate()) {
      throw new ForbiddenError('Usuario inativo');
    }

    return UserResponseMapper.toResponse(user);
  }
}
