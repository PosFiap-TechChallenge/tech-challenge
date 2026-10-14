import { inject, injectable } from 'inversify';
import { User } from '../../../domain/aggregates/User.ts';
import type { PasswordHasher } from '../../../domain/providers/PasswordHasher.ts';
import type { TokenProvider } from '../../../domain/providers/TokenProvider.ts';
import type { UserRepository } from '../../../domain/repositories/UserRepository.ts';
import type { SignInInput } from '../../dto/inputs/SignInInput.ts';
import type { AuthTokenOutput } from '../../dto/outputs/AuthTokenOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ForbiddenError, InvalidCredentialsError } from '../../exceptions/AppError.ts';
import { UserResponseMapper } from '../../mappers/UserResponseMapper.ts';

@injectable()
export class SignInUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: UserRepository,
    @inject(TYPES.PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
    @inject(TYPES.TokenProvider)
    private readonly tokenProvider: TokenProvider,
  ) {}

  async execute(input: SignInInput): Promise<AuthTokenOutput> {
    const user = await this.userRepository.findByEmail(User.normalizeEmail(input.email));

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await user.verifyPassword(input.password, this.passwordHasher);

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    if (!user.canAuthenticate()) {
      throw new ForbiddenError('Usuario inativo');
    }

    const issuedToken = await this.tokenProvider.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { ...issuedToken, user: UserResponseMapper.toResponse(user) };
  }
}
