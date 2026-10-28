/** Para testes: falha com mensagem clara em vez de afirmar com `as` que o valor existe. */
export function required<T>(value: T | null | undefined, what = 'valor'): T {
  if (value === null || value === undefined) {
    throw new Error(`${what} esperado nos dados do teste`);
  }

  return value;
}
