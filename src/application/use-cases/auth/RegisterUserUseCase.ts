import { inject, injectable } from 'inversify';
import { User } from '../../../domain/aggregates/User.ts';
import type { PasswordHasher } from '../../../domain/providers/PasswordHasher.ts';
import type { UserRepository } from '../../../domain/repositories/UserRepository.ts';
import type { RegisterUserInput } from '../../dto/inputs/RegisterUserInput.ts';
import type { UserOutput } from '../../dto/outputs/UserOutput.ts';
import { TYPES } from '../../dto/Types.ts';
import { ConflictError } from '../../exceptions/AppError.ts';
import { UserResponseMapper } from '../../mappers/UserResponseMapper.ts';

@injectable()
export class RegisterUserUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: UserRepository,
    @inject(TYPES.PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput): Promise<UserOutput> {
    const user = await User.create(input, this.passwordHasher);

    const existingUser = await this.userRepository.findByEmail(user.email);

    if (existingUser) {
      throw new ConflictError('Usuario', 'email');
    }

    await this.userRepository.create(user);

    return UserResponseMapper.toResponse(user);
  }
}
