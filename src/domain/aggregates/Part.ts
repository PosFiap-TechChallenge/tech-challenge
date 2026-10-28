import type { z } from 'zod';
import { DomainError } from '../errors/DomainError.ts';
import { InitialStockRegisteredEvent } from '../events/InitialStockRegisteredEvent.ts';
import { MinimumStockReachedEvent } from '../events/MinimumStockReachedEvent.ts';
import { PartConsumedEvent } from '../events/PartConsumedEvent.ts';
import { PartReservationReleasedEvent } from '../events/PartReservationReleasedEvent.ts';
import { PartReservedEvent } from '../events/PartReservedEvent.ts';
import { StockAdjustedEvent } from '../events/StockAdjustedEvent.ts';
import { StockEntryRegisteredEvent } from '../events/StockEntryRegisteredEvent.ts';
import { partSchema, type PartData } from '../schemas/PartSchema.ts';
import { stockAdjustmentSchema } from '../schemas/StockMovementSchema.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { applyChanges, type Changes } from '../shared/Changes.ts';
import { generateId } from '../shared/Entity.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import { isFractionable, type MeasurementUnit } from '../value-objects/MeasurementUnit.ts';
import { Money } from '../value-objects/Money.ts';
import type { PartType } from '../value-objects/PartType.ts';
import { Quantity, QUANTITY_MAX } from '../value-objects/Quantity.ts';
import type { StockMovement, StockMovementType } from '../value-objects/StockMovement.ts';

export type PartId = Brand<string, 'PartId'>;

const MAX_BALANCE = Quantity.of(QUANTITY_MAX);

type StockFields = 'quantity' | 'reserved' | 'minimumStock';

type PartProps = Omit<PartData, 'id' | 'unitPrice' | StockFields> & {
  unitPrice: Money;
  quantity: Quantity;
  reserved: Quantity;
  minimumStock: Quantity;
};

/** Dados do cadastro: o estoque inicial vira o saldo fisico. */
export type NewPartData = Pick<
  PartData,
  'code' | 'name' | 'type' | 'unit' | 'unitPrice' | 'minimumStock'
> & { initialQuantity: number };

/**
 * Campos editaveis. Saldos so mudam pelos comandos de estoque, e a unidade nao muda:
 * o saldo existente seria reinterpretado (ex.: 4 L viraria 4 ML).
 */
type EditablePartContent = Pick<PartData, 'code' | 'name' | 'type' | 'unitPrice' | 'minimumStock'>;

const ERROR_CODES = {
  code: 'INVALID_PART_CODE',
  name: 'INVALID_PART_TEXT',
  type: 'INVALID_PART_TYPE',
  unit: 'INVALID_MEASUREMENT_UNIT',
  unitPrice: 'INVALID_MONEY',
  quantity: 'INVALID_QUANTITY',
  reserved: 'INVALID_QUANTITY',
  minimumStock: 'INVALID_QUANTITY',
};

const ADJUSTMENT_ERROR_CODES = {
  quantity: 'INVALID_QUANTITY',
  reason: 'INVALID_PART_TEXT',
};

const STOCK_FIELDS: readonly StockFields[] = ['quantity', 'reserved', 'minimumStock'];

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

  /** Valida o schema e as regras que cruzam campos: fracao em UN e reservado acima do saldo. */
  private static parse(data: z.input<typeof partSchema>): PartData {
    const part = parseSchema(partSchema, data, ERROR_CODES, 'INVALID_PART');

    for (const field of STOCK_FIELDS) {
      Part.requireQuantity(part[field], part.unit, field);
    }

    if (Quantity.of(part.reserved).isGreaterThan(Quantity.of(part.quantity))) {
      throw new DomainError(
        'reserved: Reservado nao pode ser maior que o saldo fisico',
        'INVALID_QUANTITY',
      );
    }

    return part;
  }

  private static toProps({
    id: _id,
    unitPrice,
    quantity,
    reserved,
    minimumStock,
    ...data
  }: PartData): PartProps {
    return {
      ...data,
      unitPrice: Money.of(unitPrice),
      quantity: Quantity.of(quantity),
      reserved: Quantity.of(reserved),
      minimumStock: Quantity.of(minimumStock),
    };
  }

  static create({ initialQuantity, ...input }: NewPartData): Part {
    const now = new Date();

    const part = Part.from({
      ...input,
      id: generateId<PartId>(),
      quantity: initialQuantity,
      reserved: 0,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    part.recordMovement('INITIAL', part.quantity, null);
    part.raiseEvent(
      new InitialStockRegisteredEvent({
        partId: part.id,
        code: part.code,
        quantity: part.quantity,
        minimumStock: part.minimumStock,
      }),
    );

    return part;
  }

  static from(data: z.input<typeof partSchema>): Part {
    const part = Part.parse(data);

    return new Part(Part.toProps(part), part.id as PartId);
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

  toData(): PartData {
    const { unitPrice, quantity, reserved, minimumStock, ...data } = this.props;

    return {
      ...data,
      id: this.id,
      unitPrice: unitPrice.value,
      quantity: quantity.value,
      reserved: reserved.value,
      minimumStock: minimumStock.value,
    };
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
    const adjustment = parseSchema(
      stockAdjustmentSchema,
      { quantity: countedQuantity, reason },
      ADJUSTMENT_ERROR_CODES,
      'INVALID_STOCK_ADJUSTMENT',
    );
    const balanceAfter = Part.requireQuantity(
      adjustment.quantity,
      this.props.unit,
      'Quantidade ajustada',
    );
    const justification = adjustment.reason;

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

  /** Confirma que a quantidade cabe no disponivel, sem reservar: verificacao ao montar a Ordem de Servico. */
  assertAvailable(quantity: number): void {
    this.requireAvailable(this.requirePositive(quantity, 'Quantidade solicitada'));
  }

  reserve(quantity: number): void {
    const amount = this.requirePositive(quantity, 'Quantidade a reservar');

    this.requireAvailable(amount);

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
  update({ code, name, type, unitPrice, minimumStock }: Changes<EditablePartContent>): void {
    const editable = { code, name, type, unitPrice, minimumStock };
    const next = Part.parse({ ...applyChanges(this.toData(), editable), updatedAt: new Date() });

    Object.assign(this.props, Part.toProps(next));
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

  private requireAvailable(amount: Quantity): void {
    if (amount.isGreaterThan(this.availableQuantity)) {
      throw new DomainError(
        `Saldo disponivel insuficiente: disponivel ${this.available}, solicitado ${amount.value}`,
        'INSUFFICIENT_STOCK',
      );
    }
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
}
