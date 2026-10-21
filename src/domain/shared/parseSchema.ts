import type { z } from 'zod';
import { DomainError } from '../errors/DomainError.ts';

export type FieldErrorCodes = Readonly<Record<string, string>>;

/**
 * Valida os dados de um agregado com o schema do dominio. A primeira falha vira
 * DomainError com o codigo do campo, mantendo o agregado sempre valido.
 */
export function parseSchema<Schema extends z.ZodType>(
  schema: Schema,
  data: z.input<Schema>,
  codes: FieldErrorCodes,
  fallbackCode: string,
): z.output<Schema> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const [issue] = result.error.issues;
    const field = issue?.path[0] === undefined ? '' : String(issue.path[0]);
    const message = issue?.message ?? 'Dados invalidos';

    throw new DomainError(field ? `${field}: ${message}` : message, codes[field] ?? fallbackCode);
  }

  return result.data;
}
