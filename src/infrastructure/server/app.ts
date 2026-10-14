import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import type { Container } from 'inversify';
import swaggerUi from 'swagger-ui-express';
import { TYPES } from '../../application/dto/Types.ts';
import { env } from '../env/Env.ts';
import type { AuthMiddleware } from '../http/middlewares/AuthMiddleware.ts';
import { errorHandler } from '../http/middlewares/errorHandler.ts';
import { registerControllers } from '../http/routing/registerControllers.ts';
import { buildOpenApiDocument } from './swagger.ts';

export function createApp(container: Container): Express {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https:'],
          'img-src': ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  const router = Router();

  registerControllers(router, container.getAll<object>(TYPES.Controller), {
    authMiddleware: container.get<AuthMiddleware>(TYPES.AuthMiddleware),
  });

  app.use(router);

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(buildOpenApiDocument()));

  app.use(errorHandler());

  return app;
}
