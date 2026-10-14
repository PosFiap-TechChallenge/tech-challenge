import type { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import { GetAuthenticatedUserUseCase } from '../../application/use-cases/auth/GetAuthenticatedUserUseCase.ts';
import { RegisterUserUseCase } from '../../application/use-cases/auth/RegisterUserUseCase.ts';
import { SignInUseCase } from '../../application/use-cases/auth/SignInUseCase.ts';
import { GetHealthUseCase } from '../../application/use-cases/GetHealthUseCase.ts';

export function configureUseCases(container: Container): void {
  container.bind<GetHealthUseCase>(TYPES.GetHealthUseCase).to(GetHealthUseCase).inTransientScope();
  container.bind<SignInUseCase>(TYPES.SignInUseCase).to(SignInUseCase).inTransientScope();
  container
    .bind<RegisterUserUseCase>(TYPES.RegisterUserUseCase)
    .to(RegisterUserUseCase)
    .inTransientScope();
  container
    .bind<GetAuthenticatedUserUseCase>(TYPES.GetAuthenticatedUserUseCase)
    .to(GetAuthenticatedUserUseCase)
    .inTransientScope();
}
