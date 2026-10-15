export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'DOMAIN_RULE_VIOLATION',
  ) {
    super(message);
    this.name = new.target.name;
  }
}
