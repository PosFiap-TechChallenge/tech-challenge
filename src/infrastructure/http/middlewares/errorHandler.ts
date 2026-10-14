import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { logger } from '../../logger/Logger.ts';
import { AppError } from '../../../application/exceptions/AppError.ts';
import { DomainError } from '../../../domain/errors/DomainError.ts';

export function errorHandler(): ErrorRequestHandler {
  return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ZodError) {
      logger.warn('falha de validacao na requisicao', {
        method: req.method,
        path: req.originalUrl,
        issues: error.issues.length,
      });

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Falha de validacao',
          details: z.treeifyError(error),
        },
      });
      return;
    }

    if (error instanceof DomainError) {
      logger.warn('regra de dominio violada', {
        method: req.method,
        path: req.originalUrl,
        code: error.code,
      });

      res.status(422).json({ error: { code: error.code, message: error.message } });
      return;
    }

    if (error instanceof AppError) {
      logger.warn('erro de aplicacao', {
        method: req.method,
        path: req.originalUrl,
        code: error.code,
        statusCode: error.statusCode,
      });

      res.status(error.statusCode).json(error.toJSON());
      return;
    }

    logger.error('erro nao tratado', {
      method: req.method,
      path: req.originalUrl,
      reason: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno do servidor',
      },
    });
  };
}
