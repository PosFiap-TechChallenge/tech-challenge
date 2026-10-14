export abstract class DomainEvent<Payload extends object = object> {
  abstract readonly name: string;

  readonly occurredAt: Date = new Date();

  constructor(public readonly payload: Payload) {}
}
