import 'reflect-metadata';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type RouteDefinition = {
  method: HttpMethod;
  path: string;
  handlerName: string | symbol;
};

const ROUTES_METADATA_KEY = Symbol('http:routes');

function isRouteDefinitionList(value: unknown): value is RouteDefinition[] {
  return Array.isArray(value);
}

function readRoutes(target: object): RouteDefinition[] {
  const routes: unknown = Reflect.getMetadata(ROUTES_METADATA_KEY, target);

  return isRouteDefinitionList(routes) ? routes : [];
}

/**
 * Expoe o metodo como handler HTTP. O metodo recebe `(req, res)` e pode ser
 * assincrono: o Express 5 encaminha a rejeicao da promise ao errorHandler.
 */
export function Route(method: HttpMethod, path: string) {
  return (target: object, propertyKey: string | symbol, _descriptor?: PropertyDescriptor): void => {
    const routes = [...readRoutes(target), { method, path, handlerName: propertyKey }];

    Reflect.defineMetadata(ROUTES_METADATA_KEY, routes, target);
  };
}

export function getRouteDefinitions(controller: object): RouteDefinition[] {
  return readRoutes(Object.getPrototypeOf(controller) as object);
}
