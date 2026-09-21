export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

function write(level: LogLevel, message: string, context: LogContext): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;

  stream.write(`${JSON.stringify(entry)}\n`);
}

export function createLogger(baseContext: LogContext = {}): Logger {
  return {
    debug: (message, context = {}) => write('debug', message, { ...baseContext, ...context }),
    info: (message, context = {}) => write('info', message, { ...baseContext, ...context }),
    warn: (message, context = {}) => write('warn', message, { ...baseContext, ...context }),
    error: (message, context = {}) => write('error', message, { ...baseContext, ...context }),
  };
}

export const logger: Logger = createLogger({ service: 'techchallenge-api' });
