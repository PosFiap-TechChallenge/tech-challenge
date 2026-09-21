import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

export interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export interface ValidatedData {
  body?: unknown;
  params?: unknown;
  query?: unknown;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validated?: ValidatedData;
    }
  }
}

/**
 * O Express 5 expoe `req.query` e `req.params` como getters somente leitura, por
 * isso o resultado do parse fica em `req.validated` em vez de sobrescrever o request.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const validated: ValidatedData = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);

      if (!result.success) {
        next(result.error);
        return;
      }

      validated.body = result.data;
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);

      if (!result.success) {
        next(result.error);
        return;
      }

      validated.params = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);

      if (!result.success) {
        next(result.error);
        return;
      }

      validated.query = result.data;
    }

    req.validated = validated;

    next();
  };
}
