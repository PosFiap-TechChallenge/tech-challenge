import type { z } from 'zod';
import { DomainError } from '../errors/DomainError.ts';
import { serviceItemSchema, type ServiceItemData } from '../schemas/ServiceItemSchema.ts';
import type { Brand } from '../shared/Brand.ts';
import { Entity, generateId } from '../shared/Entity.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import { Money } from '../value-objects/Money.ts';

export type ServiceItemId = Brand<string, 'ServiceItemId'>;

type ServiceItemProps = Omit<ServiceItemData, 'id' | 'price'> & { price: Money };

export type NewServiceItem = Pick<
  ServiceItemData,
  'serviceId' | 'name' | 'price' | 'estimatedMinutes'
>;

const MS_PER_MINUTE = 60_000;

const ERROR_CODES = {
  serviceId: 'INVALID_ORDER_SERVICE',
  name: 'INVALID_SERVICE_NAME',
  price: 'INVALID_MONEY',
  estimatedMinutes: 'INVALID_SERVICE_DURATION',
};

/** Item de Servico: o servico efetivamente contratado na OS, com preco congelado na inclusao. */
export class ServiceItem extends Entity<ServiceItemProps, ServiceItemId> {
  private constructor(props: ServiceItemProps, id: ServiceItemId) {
    super(props, id);
  }

  static create(input: NewServiceItem): ServiceItem {
    return ServiceItem.from({
      ...input,
      id: generateId<ServiceItemId>(),
      startedAt: null,
      finishedAt: null,
      createdAt: new Date(),
    });
  }

  static from(data: z.input<typeof serviceItemSchema>): ServiceItem {
    const { id, price, ...item } = parseSchema(
      serviceItemSchema,
      data,
      ERROR_CODES,
      'INVALID_ORDER_SERVICE',
    );

    return new ServiceItem({ ...item, price: Money.of(price) }, id as ServiceItemId);
  }

  get serviceId(): string {
    return this.props.serviceId;
  }

  get name(): string {
    return this.props.name;
  }

  get price(): Money {
    return this.props.price;
  }

  get estimatedMinutes(): number {
    return this.props.estimatedMinutes;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get finishedAt(): Date | null {
    return this.props.finishedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Tempo de execucao: intervalo entre o inicio e a conclusao do item. */
  get executionMinutes(): number | null {
    const { startedAt, finishedAt } = this.props;

    if (!startedAt || !finishedAt) {
      return null;
    }

    return (finishedAt.getTime() - startedAt.getTime()) / MS_PER_MINUTE;
  }

  start(at: Date): void {
    if (this.props.startedAt) {
      throw new DomainError('Execucao do servico ja foi iniciada', 'EXECUTION_ALREADY_STARTED');
    }

    this.props.startedAt = at;
  }

  finish(at: Date): void {
    const { startedAt, finishedAt } = this.props;

    if (!startedAt) {
      throw new DomainError('Execucao do servico nao foi iniciada', 'EXECUTION_NOT_STARTED');
    }

    if (finishedAt) {
      throw new DomainError('Execucao do servico ja foi concluida', 'EXECUTION_ALREADY_FINISHED');
    }

    if (at < startedAt) {
      throw new DomainError('Conclusao nao pode ser anterior ao inicio', 'INVALID_EXECUTION_TIME');
    }

    this.props.finishedAt = at;
  }

  toData(): ServiceItemData {
    return { ...this.props, id: this.id, price: this.props.price.value };
  }
}
