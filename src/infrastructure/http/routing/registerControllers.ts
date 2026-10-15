import type { RequestHandler, Router } from 'express';
import type { AuthMiddleware } from '../middlewares/AuthMiddleware.ts';
import { getAuthRequirement } from './Auth.ts';
import { getRouteDefinitions, type RouteDefinition } from './Route.ts';

export type RegisterControllersOptions = {
  authMiddleware: AuthMiddleware;
};

function resolveHandler(controller: object, handlerName: string | symbol): RequestHandler {
  const candidate: unknown = Reflect.get(controller, handlerName);

  if (typeof candidate !== 'function') {
    throw new Error(`${controller.constructor.name}.${String(handlerName)} nao e um metodo`);
  }

  return candidate.bind(controller) as RequestHandler;
}

function buildRouteHandlers(
  controller: object,
  route: RouteDefinition,
  { authMiddleware }: RegisterControllersOptions,
): RequestHandler[] {
  const handler = resolveHandler(controller, route.handlerName);
  const authRequirement = getAuthRequirement(controller, route.handlerName);

  if (!authRequirement) {
    return [handler];
  }

  return [authMiddleware.handle(authRequirement.roles), handler];
}

export function registerControllers(
  router: Router,
  controllers: readonly object[],
  options: RegisterControllersOptions,
): void {
  for (const controller of controllers) {
    for (const route of getRouteDefinitions(controller)) {
      router[route.method](route.path, buildRouteHandlers(controller, route, options));
    }
  }
}
