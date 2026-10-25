import type { z } from 'zod';
import { ServiceRegisteredEvent } from '../events/ServiceRegisteredEvent.ts';
import { serviceSchema, type ServiceData } from '../schemas/ServiceSchema.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { applyChanges, type Changes } from '../shared/Changes.ts';
import { generateId } from '../shared/Entity.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import { Money } from '../value-objects/Money.ts';

export type ServiceId = Brand<string, 'ServiceId'>;

type ServiceProps = Omit<ServiceData, 'id' | 'price'> & { price: Money };

type ServiceContent = Omit<ServiceData, 'id' | 'createdAt' | 'updatedAt'>;

const ERROR_CODES = {
  name: 'INVALID_SERVICE_NAME',
  price: 'INVALID_MONEY',
  estimatedMinutes: 'INVALID_SERVICE_DURATION',
};

/**
 * Item do catalogo da oficina, com preco e tempo estimado. A Ordem de Servico
 * copia o preco ao incluir o servico, entao editar o catalogo nao altera orcamentos ja gerados.
 */
export class Service extends AggregateRoot<ServiceProps, ServiceId> {
  private constructor(props: ServiceProps, id: ServiceId) {
    super(props, id);
  }

  private static parse(data: z.input<typeof serviceSchema>): ServiceData {
    return parseSchema(serviceSchema, data, ERROR_CODES, 'INVALID_SERVICE');
  }

  private static toProps({ id: _id, price, ...data }: ServiceData): ServiceProps {
    return { ...data, price: Money.of(price) };
  }

  static create(input: ServiceContent): Service {
    const now = new Date();

    const service = Service.from({
      ...input,
      id: generateId<ServiceId>(),
      createdAt: now,
      updatedAt: now,
    });

    service.raiseEvent(new ServiceRegisteredEvent({ serviceId: service.id, name: service.name }));

    return service;
  }

  static from(data: z.input<typeof serviceSchema>): Service {
    const service = Service.parse(data);

    return new Service(Service.toProps(service), service.id as ServiceId);
  }

  get name(): string {
    return this.props.name;
  }

  get price(): number {
    return this.props.price.value;
  }

  get estimatedMinutes(): number {
    return this.props.estimatedMinutes;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toData(): ServiceData {
    return { ...this.props, id: this.id, price: this.props.price.value };
  }

  /** Valida todos os campos antes de aplicar: uma falha nao deixa o servico parcialmente alterado. */
  update(changes: Changes<ServiceContent>): void {
    const next = Service.parse({ ...applyChanges(this.toData(), changes), updatedAt: new Date() });

    Object.assign(this.props, Service.toProps(next));
  }
}
