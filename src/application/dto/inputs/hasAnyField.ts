export function hasAnyField(input: object): boolean {
  return Object.values(input).some((value) => value !== undefined);
}
