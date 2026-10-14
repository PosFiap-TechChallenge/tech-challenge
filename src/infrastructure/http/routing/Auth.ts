import 'reflect-metadata';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../../domain/providers/TokenProvider.ts';
import type { UserRole } from '../../../domain/value-objects/UserRole.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export type AuthenticatedRequest = Request & { auth: AccessTokenPayload };

export type AuthRequirement = {
  roles: readonly UserRole[];
};

const AUTH_METADATA_KEY = Symbol('http:auth');

function isAuthRequirement(value: unknown): value is AuthRequirement {
  return typeof value === 'object' && value !== null && 'roles' in value;
}

/**
 * Exige um JWT valido no header `Authorization: Bearer <token>`.
 *
 * - `@Auth()` aceita qualquer usuario autenticado.
 * - `@Auth(UserRole.ADMIN, ...)` aceita apenas os papeis informados.
 *
 * Pode decorar a classe (vale para todas as rotas) ou o metodo; o decorator do
 * metodo tem precedencia sobre o da classe.
 */
export function Auth(...roles: UserRole[]) {
  const requirement: AuthRequirement = { roles };

  return (
    target: object,
    propertyKey?: string | symbol,
    _descriptor?: PropertyDescriptor,
  ): void => {
    if (propertyKey === undefined) {
      Reflect.defineMetadata(AUTH_METADATA_KEY, requirement, target);
      return;
    }

    Reflect.defineMetadata(AUTH_METADATA_KEY, requirement, target, propertyKey);
  };
}

export function getAuthRequirement(
  controller: object,
  handlerName: string | symbol,
): AuthRequirement | undefined {
  const methodRequirement: unknown = Reflect.getMetadata(
    AUTH_METADATA_KEY,
    controller,
    handlerName,
  );

  if (isAuthRequirement(methodRequirement)) {
    return methodRequirement;
  }

  const classRequirement: unknown = Reflect.getMetadata(AUTH_METADATA_KEY, controller.constructor);

  return isAuthRequirement(classRequirement) ? classRequirement : undefined;
}
