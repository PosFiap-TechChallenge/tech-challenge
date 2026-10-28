import type { z } from 'zod';
import { PartItem } from '../entities/PartItem.ts';
import { ServiceItem } from '../entities/ServiceItem.ts';
import { DomainError } from '../errors/DomainError.ts';
import { BudgetApprovedEvent } from '../events/BudgetApprovedEvent.ts';
import { BudgetGeneratedEvent } from '../events/BudgetGeneratedEvent.ts';
import { BudgetRejectedEvent } from '../events/BudgetRejectedEvent.ts';
import { BudgetSentEvent } from '../events/BudgetSentEvent.ts';
import { DiagnosisStartedEvent } from '../events/DiagnosisStartedEvent.ts';
import { ExecutionStartedEvent } from '../events/ExecutionStartedEvent.ts';
import { PartAddedEvent } from '../events/PartAddedEvent.ts';
import { ServiceAddedEvent } from '../events/ServiceAddedEvent.ts';
import { ServiceOrderCreatedEvent } from '../events/ServiceOrderCreatedEvent.ts';
import { ServiceOrderFinishedEvent } from '../events/ServiceOrderFinishedEvent.ts';
import { VehicleDeliveredEvent } from '../events/VehicleDeliveredEvent.ts';
import type { PartData } from '../schemas/PartSchema.ts';
import type { ServiceData } from '../schemas/ServiceSchema.ts';
import {
  serviceOrderSchema,
  type ServiceOrderData,
  type StatusChange,
} from '../schemas/ServiceOrderSchema.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { generateId } from '../shared/Entity.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import { Budget } from '../value-objects/Budget.ts';
import { Money } from '../value-objects/Money.ts';
import { canTransition, isEditable, OrderStatus } from '../value-objects/OrderStatus.ts';
import { Quantity } from '../value-objects/Quantity.ts';
import type { CustomerId } from './Customer.ts';
import type { VehicleId } from './Vehicle.ts';

export type ServiceOrderId = Brand<string, 'ServiceOrderId'>;

type ServiceOrderProps = Omit<
  ServiceOrderData,
  'id' | 'customerId' | 'vehicleId' | 'serviceItems' | 'partItems' | 'budget'
> & {
  customerId: CustomerId;
  vehicleId: VehicleId;
  serviceItems: ServiceItem[];
  partItems: PartItem[];
  budget: Budget | null;
};

export type NewServiceOrder = Pick<ServiceOrderData, 'customerId' | 'vehicleId'>;

/** Dados do catalogo copiados para o Item de Servico. */
export type ServiceSource = Pick<ServiceData, 'id' | 'name' | 'price' | 'estimatedMinutes'>;

/** Dados do estoque copiados para o Item de Peca. */
export type PartSource = Pick<PartData, 'id' | 'code' | 'name' | 'unit' | 'unitPrice'>;

export type StockItem = { partId: string; quantity: number };

const ERROR_CODES = {
  customerId: 'INVALID_ORDER_CUSTOMER',
  vehicleId: 'INVALID_ORDER_VEHICLE',
  status: 'INVALID_ORDER_STATUS',
  serviceItems: 'INVALID_ORDER_ITEM',
  partItems: 'INVALID_ORDER_ITEM',
  budget: 'INVALID_BUDGET',
  history: 'INVALID_ORDER_HISTORY',
};

function totalOf(services: readonly ServiceItem[], parts: readonly PartItem[]): Money {
  const servicesTotal = services.reduce((sum, item) => sum.plus(item.price), Money.ZERO);

  return parts.reduce((sum, item) => sum.plus(item.total), servicesTotal);
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

/**
 * Ordem de Servico: reune o veiculo do cliente, os servicos contratados, as pecas
 * aplicadas e o orcamento. Cada comando e uma transicao da tabela de `OrderStatus`;
 * nao existe operacao que escolha o status diretamente.
 */
export class ServiceOrder extends AggregateRoot<ServiceOrderProps, ServiceOrderId> {
  private constructor(props: ServiceOrderProps, id: ServiceOrderId) {
    super(props, id);
  }

  private static parse(data: z.input<typeof serviceOrderSchema>): ServiceOrderData {
    const order = parseSchema(serviceOrderSchema, data, ERROR_CODES, 'INVALID_SERVICE_ORDER');

    if (
      hasDuplicates(order.serviceItems.map((item) => item.serviceId)) ||
      hasDuplicates(order.partItems.map((item) => item.partId))
    ) {
      throw new DomainError('Servico ou peca repetido na OS', 'INVALID_ORDER_ITEM');
    }

    return order;
  }

  static create(input: NewServiceOrder): ServiceOrder {
    const now = new Date();

    const order = ServiceOrder.from({
      ...input,
      id: generateId<ServiceOrderId>(),
      status: OrderStatus.RECEIVED,
      serviceItems: [],
      partItems: [],
      budget: null,
      history: [{ status: OrderStatus.RECEIVED, occurredAt: now }],
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    order.raiseEvent(
      new ServiceOrderCreatedEvent({
        orderId: order.id,
        customerId: order.customerId,
        vehicleId: order.vehicleId,
      }),
    );

    return order;
  }

  static from(data: z.input<typeof serviceOrderSchema>): ServiceOrder {
    const { id, customerId, vehicleId, serviceItems, partItems, budget, ...order } =
      ServiceOrder.parse(data);

    return new ServiceOrder(
      {
        ...order,
        customerId: customerId as CustomerId,
        vehicleId: vehicleId as VehicleId,
        serviceItems: serviceItems.map((item) => ServiceItem.from(item)),
        partItems: partItems.map((item) => PartItem.from(item)),
        budget: budget ? Budget.from(budget) : null,
      },
      id as ServiceOrderId,
    );
  }

  get customerId(): CustomerId {
    return this.props.customerId;
  }

  get vehicleId(): VehicleId {
    return this.props.vehicleId;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get serviceItems(): readonly ServiceItem[] {
    return [...this.props.serviceItems];
  }

  get partItems(): readonly PartItem[] {
    return [...this.props.partItems];
  }

  get budget(): Budget | null {
    return this.props.budget;
  }

  get history(): readonly StatusChange[] {
    return [...this.props.history];
  }

  /** Versao lida do banco; usada pelo repositorio para detectar escrita concorrente. */
  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Orcamento automatico: soma dos servicos e das pecas (preco x quantidade), sempre atual. */
  get budgetTotal(): Money {
    return totalOf(this.props.serviceItems, this.props.partItems);
  }

  /** Pecas a reservar na aprovacao e a consumir na conclusao. */
  get stockItems(): StockItem[] {
    return this.props.partItems.map((item) => ({
      partId: item.partId,
      quantity: item.quantity.value,
    }));
  }

  requestedQuantity(partId: string): number {
    return this.findPart(partId)?.quantity.value ?? 0;
  }

  toData(): ServiceOrderData {
    const { serviceItems, partItems, budget, ...props } = this.props;

    return {
      ...props,
      id: this.id,
      serviceItems: serviceItems.map((item) => item.toData()),
      partItems: partItems.map((item) => item.toData()),
      budget: budget?.toData() ?? null,
    };
  }

  addService(source: ServiceSource): void {
    this.assertEditable();

    if (this.props.serviceItems.some((item) => item.serviceId === source.id)) {
      throw new DomainError('Servico ja esta na OS', 'SERVICE_ALREADY_IN_ORDER');
    }

    const item = ServiceItem.create({
      serviceId: source.id,
      name: source.name,
      price: source.price,
      estimatedMinutes: source.estimatedMinutes,
    });

    totalOf([...this.props.serviceItems, item], this.props.partItems);

    this.props.serviceItems.push(item);
    this.touch(new Date());
    this.raiseEvent(
      new ServiceAddedEvent({ orderId: this.id, serviceId: source.id, price: item.price.value }),
    );
  }

  removeService(itemId: string): void {
    this.assertEditable();

    this.props.serviceItems = this.without(this.props.serviceItems, itemId);
    this.touch(new Date());
  }

  /** Peca ja presente na OS tem a quantidade somada e mantem o preco congelado na primeira inclusao. */
  addPart(source: PartSource, quantity: number): void {
    this.assertEditable();

    const existing = this.findPart(source.id);

    if (existing) {
      this.mergeIntoPart(existing, quantity);
    } else {
      this.appendPart(source, quantity);
    }

    this.touch(new Date());
    this.raiseEvent(new PartAddedEvent({ orderId: this.id, partId: source.id, quantity }));
  }

  removePart(itemId: string): void {
    this.assertEditable();

    this.props.partItems = this.without(this.props.partItems, itemId);
    this.touch(new Date());
  }

  startDiagnosis(): void {
    this.assertTransition(OrderStatus.RECEIVED, OrderStatus.IN_DIAGNOSIS);

    this.transitionTo(OrderStatus.IN_DIAGNOSIS, new Date());
    this.raiseEvent(new DiagnosisStartedEvent({ orderId: this.id }));
  }

  /** Gera o orcamento automaticamente, com o total congelado, e o envia ao cliente para aprovacao. */
  sendBudget(): void {
    this.assertTransition(OrderStatus.IN_DIAGNOSIS, OrderStatus.AWAITING_APPROVAL);

    if (this.props.serviceItems.length === 0) {
      throw new DomainError('OS sem servicos nao gera orcamento', 'ORDER_WITHOUT_SERVICES');
    }

    const now = new Date();
    const total = this.budgetTotal;

    this.props.budget = Budget.send(total, now);
    this.transitionTo(OrderStatus.AWAITING_APPROVAL, now);
    this.raiseEvent(new BudgetGeneratedEvent({ orderId: this.id, total: total.value }));
    this.raiseEvent(new BudgetSentEvent({ orderId: this.id, total: total.value }));
  }

  /** Aprovar inicia a execucao: politica "sempre que aprovar o orcamento, iniciar a execucao". */
  approveBudget(): void {
    this.assertTransition(OrderStatus.AWAITING_APPROVAL, OrderStatus.IN_EXECUTION);

    const now = new Date();
    const budget = this.requireBudget();

    this.props.budget = budget.approve(now);
    this.props.serviceItems.forEach((item) => item.start(now));
    this.transitionTo(OrderStatus.IN_EXECUTION, now);
    this.raiseEvent(new BudgetApprovedEvent({ orderId: this.id, total: budget.total.value }));
    this.raiseEvent(new ExecutionStartedEvent({ orderId: this.id }));
  }

  rejectBudget(): void {
    this.assertTransition(OrderStatus.AWAITING_APPROVAL, OrderStatus.IN_DIAGNOSIS);

    const now = new Date();

    this.props.budget = this.requireBudget().reject(now);
    this.transitionTo(OrderStatus.IN_DIAGNOSIS, now);
    this.raiseEvent(new BudgetRejectedEvent({ orderId: this.id }));
  }

  finish(): void {
    this.assertTransition(OrderStatus.IN_EXECUTION, OrderStatus.FINISHED);

    const now = new Date();

    this.props.serviceItems.forEach((item) => item.finish(now));
    this.transitionTo(OrderStatus.FINISHED, now);
    this.raiseEvent(
      new ServiceOrderFinishedEvent({ orderId: this.id, executionMinutes: this.executionMinutes }),
    );
  }

  deliver(): void {
    this.assertTransition(OrderStatus.FINISHED, OrderStatus.DELIVERED);

    this.transitionTo(OrderStatus.DELIVERED, new Date());
    this.raiseEvent(new VehicleDeliveredEvent({ orderId: this.id }));
  }

  /** Itens de servico compartilham a janela de execucao da OS; vale o maior intervalo medido. */
  private get executionMinutes(): number {
    return Math.max(0, ...this.props.serviceItems.map((item) => item.executionMinutes ?? 0));
  }

  private findPart(partId: string): PartItem | undefined {
    return this.props.partItems.find((item) => item.partId === partId);
  }

  private appendPart(source: PartSource, quantity: number): void {
    const item = PartItem.create({
      partId: source.id,
      code: source.code,
      name: source.name,
      unit: source.unit,
      quantity,
      unitPrice: source.unitPrice,
    });

    totalOf(this.props.serviceItems, [...this.props.partItems, item]);

    this.props.partItems.push(item);
  }

  private mergeIntoPart(existing: PartItem, quantity: number): void {
    const merged = PartItem.from({
      ...existing.toData(),
      quantity: existing.quantity.plus(Quantity.of(quantity)).value,
    });
    const parts = this.props.partItems.map((item) => (item === existing ? merged : item));

    totalOf(this.props.serviceItems, parts);

    existing.increaseBy(quantity);
  }

  private without<Item extends { id: string }>(items: readonly Item[], itemId: string): Item[] {
    if (!items.some((item) => item.id === itemId)) {
      throw new DomainError('Item nao encontrado na OS', 'ORDER_ITEM_NOT_FOUND');
    }

    return items.filter((item) => item.id !== itemId);
  }

  private requireBudget(): Budget {
    if (!this.props.budget) {
      throw new DomainError('OS sem orcamento enviado', 'ORDER_WITHOUT_BUDGET');
    }

    return this.props.budget;
  }

  private assertEditable(): void {
    if (!isEditable(this.props.status)) {
      throw new DomainError(
        `Servicos e pecas nao podem mudar com a OS em ${this.props.status}`,
        'ORDER_NOT_EDITABLE',
      );
    }
  }

  /** O comando so vale a partir do status de origem, mesmo quando a tabela aceita o destino por outro caminho. */
  private assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (this.props.status !== from || !canTransition(from, to)) {
      throw new DomainError(
        `OS em ${this.props.status} nao pode ir para ${to}`,
        'INVALID_ORDER_TRANSITION',
      );
    }
  }

  private transitionTo(next: OrderStatus, at: Date): void {
    this.props.status = next;
    this.props.history.push({ status: next, occurredAt: at });
    this.touch(at);
  }

  private touch(at: Date): void {
    this.props.updatedAt = at;
  }
}
