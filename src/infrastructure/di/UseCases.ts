import type { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import { GetHealthUseCase } from '../../application/use-cases/GetHealthUseCase.ts';

export function configureUseCases(container: Container): void {
  container.bind<GetHealthUseCase>(TYPES.GetHealthUseCase).to(GetHealthUseCase).inTransientScope();
}
