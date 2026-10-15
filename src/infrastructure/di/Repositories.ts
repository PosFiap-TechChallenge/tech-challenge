import type { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import type { UserRepository } from '../../domain/repositories/UserRepository.ts';
import { PrismaUserRepository } from '../database/repositories/PrismaUserRepository.ts';

export function configureRepositories(container: Container): void {
  container.bind<UserRepository>(TYPES.UserRepository).to(PrismaUserRepository).inTransientScope();
}
