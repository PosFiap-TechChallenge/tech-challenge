import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/** Politica de senha dos usuarios internos: 8 a 128 caracteres, com letras e numeros. */
export function passwordSchema() {
  return z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .regex(/[A-Za-z]/, { message: 'Senha deve conter letras e numeros' })
    .regex(/\d/, { message: 'Senha deve conter letras e numeros' });
}
