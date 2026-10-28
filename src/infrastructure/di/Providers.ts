import type { Container } from 'inversify';
import { TYPES } from '../../application/dto/Types.ts';
import type { DomainEventHandler } from '../../application/events/DomainEventHandler.ts';
import type { EventPublisher } from '../../domain/providers/EventPublisher.ts';
import type { PasswordHasher } from '../../domain/providers/PasswordHasher.ts';
import type { UnitOfWork } from '../../domain/providers/UnitOfWork.ts';
import type { TokenProvider } from '../../domain/providers/TokenProvider.ts';
import { PrismaUnitOfWork } from '../database/PrismaUnitOfWork.ts';
import { env } from '../env/Env.ts';
import { MinimumStockReachedAlertHandler } from '../events/handlers/MinimumStockReachedAlertHandler.ts';
import { InProcessEventPublisher } from '../events/InProcessEventPublisher.ts';
import { AuthMiddleware } from '../http/middlewares/AuthMiddleware.ts';
import { JoseTokenProvider, type JwtConfig } from '../providers/JoseTokenProvider.ts';
import { ScryptPasswordHasher } from '../providers/ScryptPasswordHasher.ts';

export function configureProviders(container: Container): void {
  container.bind<JwtConfig>(TYPES.JwtConfig).toConstantValue({
    secret: env.JWT_SECRET,
    expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  container.bind<TokenProvider>(TYPES.TokenProvider).to(JoseTokenProvider).inSingletonScope();
  container.bind<PasswordHasher>(TYPES.PasswordHasher).to(ScryptPasswordHasher).inSingletonScope();
  container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware).inSingletonScope();

  container
    .bind<DomainEventHandler>(TYPES.DomainEventHandler)
    .to(MinimumStockReachedAlertHandler)
    .inSingletonScope();
  container.bind<UnitOfWork>(TYPES.UnitOfWork).to(PrismaUnitOfWork).inSingletonScope();
  container
    .bind<EventPublisher>(TYPES.EventPublisher)
    .to(InProcessEventPublisher)
    .inSingletonScope();
}
