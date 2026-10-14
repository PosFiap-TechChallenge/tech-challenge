export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }

  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} nao encontrado`, 'NOT_FOUND', 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BAD_REQUEST', 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Nao autenticado', code = 'UNAUTHORIZED') {
    super(message, code, 401);
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('E-mail ou senha invalidos', 'INVALID_CREDENTIALS');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends AppError {
  constructor(resource: string, field: string) {
    super(`${resource} com este ${field} ja existe`, 'CONFLICT', 409, { resource, field });
  }
}
