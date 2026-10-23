/** Tolerancia para o ruido de ponto flutuante ao escalar (ex.: 0.1 * 1000 = 100.00000000000001). */
const EPSILON = 1e-6;

/**
 * Converte um decimal para inteiro na escala informada (ex.: 4.5 com 3 casas -> 4500).
 * Retorna `null` se o valor nao for finito ou tiver mais casas do que a escala permite.
 */
export function toScaledInteger(value: number, decimals: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const scaled = value * 10 ** decimals;
  const rounded = Math.round(scaled);

  return Math.abs(scaled - rounded) < EPSILON ? rounded : null;
}
