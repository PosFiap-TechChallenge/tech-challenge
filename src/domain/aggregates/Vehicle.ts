import { DomainError } from '../errors/DomainError.ts';
import { VehicleRegisteredEvent } from '../events/VehicleRegisteredEvent.ts';
import { AggregateRoot } from '../shared/AggregateRoot.ts';
import type { Brand } from '../shared/Brand.ts';
import { generateId } from '../shared/Entity.ts';
import { LicensePlate } from '../value-objects/LicensePlate.ts';
import type { CustomerId } from './Customer.ts';

export type VehicleId = Brand<string, 'VehicleId'>;

export const VEHICLE_BRAND_MAX_LENGTH = 80;
export const VEHICLE_MODEL_MAX_LENGTH = 100;
export const VEHICLE_MIN_YEAR = 1900;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VehicleProps = {
  plate: LicensePlate;
  brand: string;
  model: string;
  year: number;
  customerId: CustomerId;
  createdAt: Date;
  updatedAt: Date;
};

export type VehiclePrimitives = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NewVehicleData = {
  plate: string;
  brand: string;
  model: string;
  year: number;
  customerId: string;
};

/** `undefined` mantem o valor atual; alterar `customerId` transfere o veiculo para outro cliente. */
export type UpdateVehicleChanges = {
  plate?: string | undefined;
  brand?: string | undefined;
  model?: string | undefined;
  year?: number | undefined;
  customerId?: string | undefined;
};

export class Vehicle extends AggregateRoot<VehicleProps, VehicleId> {
  private constructor(props: VehicleProps, id: VehicleId) {
    super(props, id);
  }

  private static build(primitives: Omit<VehiclePrimitives, 'id'>): VehicleProps {
    return {
      plate: LicensePlate.create(primitives.plate),
      brand: Vehicle.requireText(primitives.brand, 'Marca', VEHICLE_BRAND_MAX_LENGTH),
      model: Vehicle.requireText(primitives.model, 'Modelo', VEHICLE_MODEL_MAX_LENGTH),
      year: Vehicle.requireValidYear(primitives.year),
      customerId: Vehicle.requireCustomerId(primitives.customerId),
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  static create(input: NewVehicleData): Vehicle {
    const now = new Date();

    const vehicle = new Vehicle(
      Vehicle.build({ ...input, createdAt: now, updatedAt: now }),
      generateId<VehicleId>(),
    );

    vehicle.raiseEvent(
      new VehicleRegisteredEvent({
        vehicleId: vehicle.id,
        customerId: vehicle.customerId,
        plate: vehicle.plate.value,
      }),
    );

    return vehicle;
  }

  static from(primitives: VehiclePrimitives): Vehicle {
    return new Vehicle(Vehicle.build(primitives), primitives.id as VehicleId);
  }

  static isValidYear(year: number): boolean {
    return Number.isInteger(year) && year >= VEHICLE_MIN_YEAR && year <= Vehicle.maxYear();
  }

  get plate(): LicensePlate {
    return this.props.plate;
  }

  get brand(): string {
    return this.props.brand;
  }

  get model(): string {
    return this.props.model;
  }

  get year(): number {
    return this.props.year;
  }

  get customerId(): CustomerId {
    return this.props.customerId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Valida todos os campos antes de aplicar: uma falha nao deixa o veiculo parcialmente alterado. */
  update(changes: UpdateVehicleChanges): void {
    const nextProps = Vehicle.build({
      plate: changes.plate ?? this.props.plate.value,
      brand: changes.brand ?? this.props.brand,
      model: changes.model ?? this.props.model,
      year: changes.year ?? this.props.year,
      customerId: changes.customerId ?? this.props.customerId,
      createdAt: this.props.createdAt,
      updatedAt: new Date(),
    });

    Object.assign(this.props, nextProps);
  }

  private static maxYear(): number {
    return new Date().getFullYear() + 1;
  }

  private static requireText(raw: string, label: string, maxLength: number): string {
    const value = raw.trim();

    if (!value || value.length > maxLength) {
      throw new DomainError(
        `${label} do veiculo deve ter entre 1 e ${maxLength} caracteres`,
        'INVALID_VEHICLE_TEXT',
      );
    }

    return value;
  }

  private static requireValidYear(year: number): number {
    if (!Vehicle.isValidYear(year)) {
      throw new DomainError(
        `Ano do veiculo deve estar entre ${VEHICLE_MIN_YEAR} e ${Vehicle.maxYear()}`,
        'INVALID_VEHICLE_YEAR',
      );
    }

    return year;
  }

  private static requireCustomerId(raw: string): CustomerId {
    if (!UUID_PATTERN.test(raw)) {
      throw new DomainError('Identificador do cliente invalido', 'INVALID_VEHICLE_CUSTOMER');
    }

    return raw as CustomerId;
  }
}
