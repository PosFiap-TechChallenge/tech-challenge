import { z } from 'zod';

const PHONE_FORMATTING = /[\s()-]/g;
const BRAZIL_COUNTRY_CODE = '+55';
const PHONE_PATTERN = /^[1-9]\d{9,10}$/;

function stripFormatting(raw: string): string {
  const compact = raw.replace(PHONE_FORMATTING, '');

  return compact.startsWith(BRAZIL_COUNTRY_CODE)
    ? compact.slice(BRAZIL_COUNTRY_CODE.length)
    : compact;
}

/** Telefone brasileiro normalizado para DDD + numero (10 ou 11 digitos); aceita mascara e +55. */
export function phoneSchema() {
  return z
    .string()
    .transform(stripFormatting)
    .pipe(z.string().regex(PHONE_PATTERN, { message: 'Telefone em formato invalido' }));
}
