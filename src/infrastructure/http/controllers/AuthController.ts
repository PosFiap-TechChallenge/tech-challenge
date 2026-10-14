import type { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { registerUserInputSchema } from '../../../application/dto/inputs/RegisterUserInput.ts';
import { signInInputSchema } from '../../../application/dto/inputs/SignInInput.ts';
import { TYPES } from '../../../application/dto/Types.ts';
import type { GetAuthenticatedUserUseCase } from '../../../application/use-cases/auth/GetAuthenticatedUserUseCase.ts';
import type { RegisterUserUseCase } from '../../../application/use-cases/auth/RegisterUserUseCase.ts';
import type { SignInUseCase } from '../../../application/use-cases/auth/SignInUseCase.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { Auth, type AuthenticatedRequest } from '../routing/Auth.ts';
import { Route } from '../routing/Route.ts';

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.SignInUseCase)
    private readonly signInUseCase: SignInUseCase,
    @inject(TYPES.RegisterUserUseCase)
    private readonly registerUserUseCase: RegisterUserUseCase,
    @inject(TYPES.GetAuthenticatedUserUseCase)
    private readonly getAuthenticatedUserUseCase: GetAuthenticatedUserUseCase,
  ) {}

  @Route('post', '/auth/sign-in')
  async signIn(req: Request, res: Response): Promise<void> {
    const input = signInInputSchema.parse(req.body);

    const output = await this.signInUseCase.execute(input);

    res.status(200).json(output);
  }

  @Auth(UserRole.ADMIN)
  @Route('post', '/auth/register')
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = registerUserInputSchema.parse(req.body);

    const output = await this.registerUserUseCase.execute(input);

    res.status(201).json(output);
  }

  @Auth()
  @Route('get', '/auth/me')
  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    const output = await this.getAuthenticatedUserUseCase.execute(req.auth.sub);

    res.status(200).json(output);
  }
}
