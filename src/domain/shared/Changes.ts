/** Alteracao parcial: `undefined` mantem o valor atual. */
export type Changes<T> = { [K in keyof T]?: T[K] | undefined };

export function applyChanges<T extends object>(current: T, changes: NoInfer<Changes<T>>): T {
  const definedChanges = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  );

  return { ...current, ...definedChanges };
}
