import 'reflect-metadata';
import { container } from '../di/Container.ts';
import { env } from '../env/Env.ts';
import { logger } from '../logger/Logger.ts';
import { createApp } from './app.ts';

const app = createApp(container);

const server = app.listen(env.PORT, () => {
  logger.info('http server iniciado', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    health: `http://localhost:${env.PORT}/health`,
    docs: `http://localhost:${env.PORT}/docs`,
  });
});

const shutdown = (signal: NodeJS.Signals): void => {
  logger.info('encerrando aplicacao', { signal });

  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('promise rejeitada sem tratamento', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('excecao nao capturada', { reason: error.message, stack: error.stack });
  process.exit(1);
});
