import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailSchema() {
  return z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_PATTERN, { message: 'E-mail em formato invalido' });
}
