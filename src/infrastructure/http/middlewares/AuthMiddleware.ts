import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../application/dto/Types.ts';
import { ForbiddenError, UnauthorizedError } from '../../../application/exceptions/AppError.ts';
import type { TokenProvider } from '../../../domain/providers/TokenProvider.ts';
import type { UserRole } from '../../../domain/value-objects/UserRole.ts';

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    return null;
  }

  return token;
}

@injectable()
export class AuthMiddleware {
  constructor(
    @inject(TYPES.TokenProvider)
    private readonly tokenProvider: TokenProvider,
  ) {}

  handle(allowedRoles: readonly UserRole[]): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      const token = extractBearerToken(req.headers.authorization);

      if (!token) {
        throw new UnauthorizedError('Token de acesso ausente', 'MISSING_TOKEN');
      }

      const payload = await this.tokenProvider.verify(token);

      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        throw new ForbiddenError('Usuario sem permissao para este recurso');
      }

      req.auth = payload;

      next();
    };
  }
}
