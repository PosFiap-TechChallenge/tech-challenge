import { DomainError } from '../errors/DomainError.ts';
import { InitialStockRegisteredEvent } from '../events/InitialStockRegisteredEvent.ts';
import { MinimumStockReachedEvent } from '../events/MinimumStockReachedEvent.ts';
import { PartConsumedEvent } from '../events/PartConsumedEvent.ts';
import { PartReservationReleasedEvent } from '../events/PartReservationReleasedEvent.ts';
import { PartReservedEvent } from '../events/PartReservedEvent.ts';
import { StockAdjustedEvent } from '../events/StockAdjustedEvent.ts';
import { StockEntryRegisteredEvent } from '../events/StockEntryRegisteredEvent.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { generateId } from '../shared/Entity.ts';
import {
  isFractionable,
  isMeasurementUnit,
  type MeasurementUnit,
} from '../value-objects/MeasurementUnit.ts';
import { Money } from '../value-objects/Money.ts';
import { isPartType, type PartType } from '../value-objects/PartType.ts';
import { Quantity, QUANTITY_MAX } from '../value-objects/Quantity.ts';
import type { StockMovement, StockMovementType } from '../value-objects/StockMovement.ts';

export type PartId = Brand<string, 'PartId'>;

export const PART_CODE_MAX_LENGTH = 40;
export const PART_NAME_MAX_LENGTH = 120;
export const PART_ADJUSTMENT_REASON_MAX_LENGTH = 255;

const MAX_BALANCE = Quantity.of(QUANTITY_MAX);

type PartProps = {
  code: string;
  name: string;
  type: PartType;
  unit: MeasurementUnit;
  unitPrice: Money;
  quantity: Quantity;
  reserved: Quantity;
  minimumStock: Quantity;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Forma plana usada na persistencia: quantidades e preco como decimais. */
export type PartPrimitives = {
  id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  reserved: number;
  minimumStock: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewPartData = {
  code: string;
  name: string;
  type: string;
  unit: string;
  unitPrice: number;
  initialQuantity: number;
  minimumStock: number;
};

/**
 * `undefined` mantem o valor atual. Saldos so mudam pelos comandos de estoque, e a
 * unidade nao muda: o saldo existente seria reinterpretado (ex.: 4 L viraria 4 ML).
 */
export type UpdatePartChanges = {
  code?: string | undefined;
  name?: string | undefined;
  type?: string | undefined;
  unitPrice?: number | undefined;
  minimumStock?: number | undefined;
};

/**
 * Estoque de uma peca ou insumo. `quantity` e o saldo fisico; `reserved` e a parte
 * dele comprometida com orcamentos aprovados; `available` e o que ainda pode ser reservado.
 * Quantidades aceitam ate 3 casas decimais, exceto em itens contados por unidade (UN).
 *
 * Cada operacao gera um evento de dominio e uma movimentacao em `pendingMovements`,
 * que o repositorio persiste junto com o novo saldo.
 */
export class Part extends AggregateRoot<PartProps, PartId> {
  private readonly movements: StockMovement[] = [];

  private constructor(props: PartProps, id: PartId) {
    super(props, id);
  }

  static create(input: NewPartData): Part {
    const now = new Date();
    const unit = Part.requireUnit(input.unit);
    const quantity = Part.requireQuantity(input.initialQuantity, unit, 'Estoque inicial');

    const part = new Part(
      {
        code: Part.normalizeCode(input.code),
        name: Part.requireText(input.name, 'Nome da peca', PART_NAME_MAX_LENGTH),
        type: Part.requireType(input.type),
        unit,
        unitPrice: Money.of(input.unitPrice, 'Preco unitario'),
        quantity,
        reserved: Quantity.ZERO,
        minimumStock: Part.requireQuantity(input.minimumStock, unit, 'Estoque minimo'),
        version: 0,
        createdAt: now,
        updatedAt: now,
      },
      generateId<PartId>(),
    );

    part.recordMovement('INITIAL', quantity.value, null);
    part.raiseEvent(
      new InitialStockRegisteredEvent({
        partId: part.id,
        code: part.code,
        quantity: quantity.value,
        minimumStock: part.minimumStock,
      }),
    );

    return part;
  }

  static from(primitives: PartPrimitives): Part {
    const unit = Part.requireUnit(primitives.unit);

    return new Part(
      {
        code: Part.normalizeCode(primitives.code),
        name: primitives.name,
        type: Part.requireType(primitives.type),
        unit,
        unitPrice: Money.of(primitives.unitPrice, 'Preco unitario'),
        quantity: Quantity.of(primitives.quantity, 'Saldo'),
        reserved: Quantity.of(primitives.reserved, 'Reservado'),
        minimumStock: Quantity.of(primitives.minimumStock, 'Estoque minimo'),
        version: primitives.version,
        createdAt: primitives.createdAt,
        updatedAt: primitives.updatedAt,
      },
      primitives.id as PartId,
    );
  }

  /** Codigo comparavel: sem espacos nas pontas e em maiusculas. */
  static normalizeCode(raw: string): string {
    const value = raw.trim().toUpperCase();

    if (!value || value.length > PART_CODE_MAX_LENGTH) {
      throw new DomainError(
        `Codigo da peca deve ter entre 1 e ${PART_CODE_MAX_LENGTH} caracteres`,
        'INVALID_PART_CODE',
      );
    }

    return value;
  }

  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): PartType {
    return this.props.type;
  }

  get unit(): MeasurementUnit {
    return this.props.unit;
  }

  get unitPrice(): number {
    return this.props.unitPrice.value;
  }

  get quantity(): number {
    return this.props.quantity.value;
  }

  get reserved(): number {
    return this.props.reserved.value;
  }

  get available(): number {
    return this.availableQuantity.value;
  }

  get minimumStock(): number {
    return this.props.minimumStock.value;
  }

  get isBelowMinimum(): boolean {
    return this.props.quantity.isAtMost(this.props.minimumStock);
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

  get pendingMovements(): readonly StockMovement[] {
    return [...this.movements];
  }

  registerEntry(quantity: number): void {
    const amount = this.requirePositive(quantity, 'Quantidade da entrada');
    const balanceAfter = this.props.quantity.plus(amount);

    if (balanceAfter.isGreaterThan(MAX_BALANCE)) {
      throw new DomainError(
        `Saldo da peca nao pode ultrapassar ${QUANTITY_MAX}`,
        'PART_QUANTITY_LIMIT_EXCEEDED',
      );
    }

    this.apply({ quantity: balanceAfter });
    this.recordMovement('ENTRY', amount.value, null);
    this.raiseEvent(
      new StockEntryRegisteredEvent({
        partId: this.id,
        quantity: amount.value,
        balanceAfter: balanceAfter.value,
      }),
    );
  }

  /** Substitui o saldo fisico pela quantidade contada, sem invadir o que ja esta reservado. */
  adjust(countedQuantity: number, reason: string): void {
    const balanceAfter = Part.requireQuantity(
      countedQuantity,
      this.props.unit,
      'Quantidade ajustada',
    );
    const justification = Part.requireText(
      reason,
      'Motivo do ajuste',
      PART_ADJUSTMENT_REASON_MAX_LENGTH,
    );

    if (balanceAfter.equals(this.props.quantity)) {
      throw new DomainError(
        'Quantidade ajustada igual ao saldo atual',
        'STOCK_ADJUSTMENT_UNCHANGED',
      );
    }

    if (balanceAfter.isLessThan(this.props.reserved)) {
      throw new DomainError(
        `Saldo ajustado nao pode ser menor que o reservado (${this.reserved})`,
        'STOCK_ADJUSTMENT_BELOW_RESERVED',
      );
    }

    const difference = balanceAfter.differenceFrom(this.props.quantity);

    this.apply({ quantity: balanceAfter });
    this.recordMovement('ADJUSTMENT', difference, justification);
    this.raiseEvent(
      new StockAdjustedEvent({
        partId: this.id,
        difference,
        balanceAfter: balanceAfter.value,
        reason: justification,
      }),
    );
  }

  reserve(quantity: number): void {
    const amount = this.requirePositive(quantity, 'Quantidade a reservar');

    if (amount.isGreaterThan(this.availableQuantity)) {
      throw new DomainError(
        `Saldo disponivel insuficiente: disponivel ${this.available}, solicitado ${amount.value}`,
        'INSUFFICIENT_STOCK',
      );
    }

    const reservedAfter = this.props.reserved.plus(amount);

    this.apply({ reserved: reservedAfter });
    this.recordMovement('RESERVATION', amount.value, null);
    this.raiseEvent(
      new PartReservedEvent({
        partId: this.id,
        quantity: amount.value,
        reservedAfter: reservedAfter.value,
      }),
    );
  }

  /** Baixa pecas ja reservadas: sai do saldo fisico e da reserva ao mesmo tempo. */
  consume(quantity: number): void {
    const amount = this.requireReserved(quantity, 'Quantidade a consumir');
    const balanceAfter = this.props.quantity.minus(amount);

    this.apply({ quantity: balanceAfter, reserved: this.props.reserved.minus(amount) });
    this.recordMovement('CONSUMPTION', amount.value, null);
    this.raiseEvent(
      new PartConsumedEvent({
        partId: this.id,
        quantity: amount.value,
        balanceAfter: balanceAfter.value,
      }),
    );

    if (this.isBelowMinimum) {
      this.raiseEvent(
        new MinimumStockReachedEvent({
          partId: this.id,
          code: this.code,
          balance: balanceAfter.value,
          minimumStock: this.minimumStock,
        }),
      );
    }
  }

  /** Devolve ao disponivel pecas reservadas que nao serao mais usadas (orcamento cancelado). */
  release(quantity: number): void {
    const amount = this.requireReserved(quantity, 'Quantidade a liberar');
    const reservedAfter = this.props.reserved.minus(amount);

    this.apply({ reserved: reservedAfter });
    this.recordMovement('RELEASE', amount.value, null);
    this.raiseEvent(
      new PartReservationReleasedEvent({
        partId: this.id,
        quantity: amount.value,
        reservedAfter: reservedAfter.value,
      }),
    );
  }

  /** Valida todos os campos antes de aplicar: uma falha nao deixa a peca parcialmente alterada. */
  update(changes: UpdatePartChanges): void {
    const next: Partial<PartProps> = {
      code: changes.code === undefined ? this.props.code : Part.normalizeCode(changes.code),
      name:
        changes.name === undefined
          ? this.props.name
          : Part.requireText(changes.name, 'Nome da peca', PART_NAME_MAX_LENGTH),
      type: changes.type === undefined ? this.props.type : Part.requireType(changes.type),
      unitPrice:
        changes.unitPrice === undefined
          ? this.props.unitPrice
          : Money.of(changes.unitPrice, 'Preco unitario'),
      minimumStock:
        changes.minimumStock === undefined
          ? this.props.minimumStock
          : Part.requireQuantity(changes.minimumStock, this.props.unit, 'Estoque minimo'),
    };

    Object.assign(this.props, next, { updatedAt: new Date() });
  }

  private get availableQuantity(): Quantity {
    return this.props.quantity.minus(this.props.reserved);
  }

  private apply(changes: Partial<Pick<PartProps, 'quantity' | 'reserved'>>): void {
    Object.assign(this.props, changes, { updatedAt: new Date() });
  }

  private recordMovement(type: StockMovementType, quantity: number, reason: string | null): void {
    this.movements.push({
      id: generateId(),
      partId: this.id,
      type,
      quantity,
      balanceAfter: this.quantity,
      reservedAfter: this.reserved,
      reason,
      createdAt: this.props.updatedAt,
    });
  }

  private requirePositive(value: number, label: string): Quantity {
    const amount = Part.requireQuantity(value, this.props.unit, label);

    if (amount.isZero) {
      throw new DomainError(`${label} deve ser maior que zero`, 'INVALID_QUANTITY');
    }

    return amount;
  }

  private requireReserved(value: number, label: string): Quantity {
    const amount = this.requirePositive(value, label);

    if (amount.isGreaterThan(this.props.reserved)) {
      throw new DomainError(
        `Quantidade reservada insuficiente: reservado ${this.reserved}, solicitado ${amount.value}`,
        'INSUFFICIENT_RESERVED_STOCK',
      );
    }

    return amount;
  }

  private static requireQuantity(value: number, unit: MeasurementUnit, label: string): Quantity {
    const quantity = Quantity.of(value, label);

    if (!isFractionable(unit) && !quantity.isWhole) {
      throw new DomainError(
        `${label} deve ser inteira para itens contados por unidade (${unit})`,
        'FRACTIONAL_QUANTITY_NOT_ALLOWED',
      );
    }

    return quantity;
  }

  private static requireUnit(raw: string): MeasurementUnit {
    if (!isMeasurementUnit(raw)) {
      throw new DomainError(`Unidade de medida invalida: ${raw}`, 'INVALID_MEASUREMENT_UNIT');
    }

    return raw;
  }

  private static requireType(raw: string): PartType {
    if (!isPartType(raw)) {
      throw new DomainError(`Tipo invalido: ${raw}`, 'INVALID_PART_TYPE');
    }

    return raw;
  }

  private static requireText(raw: string, label: string, maxLength: number): string {
    const value = raw.trim();

    if (!value || value.length > maxLength) {
      throw new DomainError(
        `${label} deve ter entre 1 e ${maxLength} caracteres`,
        'INVALID_PART_TEXT',
      );
    }

    return value;
  }
}
