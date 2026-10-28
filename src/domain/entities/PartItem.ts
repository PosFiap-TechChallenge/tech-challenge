import type { z } from 'zod';
import { DomainError } from '../errors/DomainError.ts';
import { partItemSchema, type PartItemData } from '../schemas/PartItemSchema.ts';
import type { Brand } from '../shared/Brand.ts';
import { Entity, generateId } from '../shared/Entity.ts';
import { parseSchema } from '../shared/parseSchema.ts';
import { isFractionable } from '../value-objects/MeasurementUnit.ts';
import { Money } from '../value-objects/Money.ts';
import { Quantity, QUANTITY_MAX } from '../value-objects/Quantity.ts';

export type PartItemId = Brand<string, 'PartItemId'>;

type PartItemProps = Omit<PartItemData, 'id' | 'quantity' | 'unitPrice'> & {
  quantity: Quantity;
  unitPrice: Money;
};

export type NewPartItem = Pick<
  PartItemData,
  'partId' | 'code' | 'name' | 'unit' | 'quantity' | 'unitPrice'
>;

const ERROR_CODES = {
  partId: 'INVALID_ORDER_PART',
  code: 'INVALID_PART_CODE',
  name: 'INVALID_PART_TEXT',
  unit: 'INVALID_MEASUREMENT_UNIT',
  quantity: 'INVALID_QUANTITY',
  unitPrice: 'INVALID_MONEY',
};

/** Item de Peca: peca ou insumo da OS, com quantidade e preco unitario congelados na inclusao. */
export class PartItem extends Entity<PartItemProps, PartItemId> {
  private constructor(props: PartItemProps, id: PartItemId) {
    super(props, id);
  }

  static create(input: NewPartItem): PartItem {
    return PartItem.from({ ...input, id: generateId<PartItemId>(), createdAt: new Date() });
  }

  static from(data: z.input<typeof partItemSchema>): PartItem {
    const { id, quantity, unitPrice, ...item } = parseSchema(
      partItemSchema,
      data,
      ERROR_CODES,
      'INVALID_ORDER_PART',
    );

    PartItem.requireWhole(quantity, item.unit);

    return new PartItem(
      { ...item, quantity: Quantity.of(quantity), unitPrice: Money.of(unitPrice) },
      id as PartItemId,
    );
  }

  private static requireWhole(quantity: number, unit: PartItemData['unit']): void {
    if (!isFractionable(unit) && !Quantity.of(quantity).isWhole) {
      throw new DomainError(
        `Quantidade deve ser inteira para itens contados por unidade (${unit})`,
        'FRACTIONAL_QUANTITY_NOT_ALLOWED',
      );
    }
  }

  get partId(): string {
    return this.props.partId;
  }

  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get unit(): PartItemData['unit'] {
    return this.props.unit;
  }

  get quantity(): Quantity {
    return this.props.quantity;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Total da linha: preco unitario x quantidade, ao centavo. */
  get total(): Money {
    return this.props.unitPrice.multipliedBy(this.props.quantity);
  }

  increaseBy(quantity: number): void {
    const increase = Quantity.of(quantity);
    const next = this.props.quantity.plus(increase);

    if (increase.isZero) {
      throw new DomainError('Quantidade deve ser maior que zero', 'INVALID_QUANTITY');
    }

    PartItem.requireWhole(quantity, this.props.unit);

    if (next.isGreaterThan(Quantity.of(QUANTITY_MAX))) {
      throw new DomainError(
        `Quantidade do item nao pode ultrapassar ${QUANTITY_MAX}`,
        'INVALID_QUANTITY',
      );
    }

    this.props.quantity = next;
  }

  toData(): PartItemData {
    return {
      ...this.props,
      id: this.id,
      quantity: this.props.quantity.value,
      unitPrice: this.props.unitPrice.value,
    };
  }
}
